import { createHash, randomUUID } from 'node:crypto';
import type { User } from '@chat-app/types';
import { logger } from '@chat-app/utils';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { QueryResultRow } from 'pg';
import { isPostgresStorageEnabled, queryDatabase, withDatabaseTransaction } from '../../config/db';
import { apiConfig } from '../../config/env';
import type { LoginPayload, SignupPayload } from './auth.validation';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

interface StoredUser {
	id: string;
	email: string;
	username: string;
	passwordHash: string;
	createdAt: string;
	updatedAt: string;
}

interface StoredRefreshToken {
	id: string;
	userId: string;
	tokenFamilyId: string;
	tokenHash: string;
	expiresAt: string;
	createdAt: string;
	lastUsedAt: string | null;
	revokedAt: string | null;
	replacedByTokenId: string | null;
	userAgent: string | null;
	ipAddress: string | null;
}

interface RefreshTokenContext {
	userAgent: string | null;
	ipAddress: string | null;
}

interface AdminAuditContext {
	actorType: 'api_key';
	actorIdentifier: string;
	actorIpAddress: string | null;
	actorUserAgent: string | null;
}

interface RefreshTokenCreation {
	id: string;
	userId: string;
	tokenFamilyId: string;
	tokenHash: string;
	expiresAt: string;
	userAgent: string | null;
	ipAddress: string | null;
}

interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

interface SignupResult {
	user: User;
}

interface AuthLoginResult extends TokenPair {
	user: User;
}

type RefreshResult = TokenPair;

export interface AuthSessionTelemetry {
	sessionId: string;
	userId: string;
	latestTokenId: string;
	status: 'active' | 'expired' | 'revoked';
	createdAt: string;
	lastUsedAt: string | null;
	expiresAt: string;
	revokedAt: string | null;
	userAgent: string | null;
	ipAddress: string | null;
}

interface AuthRepository {
	findUserByEmail(email: string): Promise<StoredUser | null>;
	findUserByUsername(username: string): Promise<StoredUser | null>;
	findUserById(userId: string): Promise<StoredUser | null>;
	createUser(user: {
		id: string;
		email: string;
		username: string;
		passwordHash: string;
		createdAt: string;
	}): Promise<StoredUser>;
	createRefreshToken(token: RefreshTokenCreation): Promise<void>;
	findRefreshTokenById(refreshTokenId: string): Promise<StoredRefreshToken | null>;
	listRefreshTokensByUserId(userId: string): Promise<StoredRefreshToken[]>;
	revokeRefreshToken(refreshTokenId: string, replacedByTokenId: string | null): Promise<boolean>;
	revokeRefreshTokenFamily(userId: string, tokenFamilyId: string): Promise<number>;
	revokeAllUserRefreshTokens(userId: string): Promise<number>;
	rotateRefreshToken(oldTokenId: string, nextToken: RefreshTokenCreation): Promise<boolean>;
	touchRefreshTokenUsage(refreshTokenId: string, timestampIso: string): Promise<void>;
}

interface DatabaseUserRow extends QueryResultRow {
	id: string;
	email: string;
	username: string;
	password_hash: string;
	created_at: Date;
	updated_at: Date;
}

interface DatabaseRefreshTokenRow extends QueryResultRow {
	id: string;
	user_id: string;
	token_family_id: string;
	token_hash: string;
	expires_at: Date;
	created_at: Date;
	last_used_at: Date | null;
	revoked_at: Date | null;
	replaced_by_token_id: string | null;
	user_agent: string | null;
	ip_address: string | null;
}

const PASSWORD_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
const jwtIssuer = 'chat-app-api';
const jwtAudience = 'chat-app-clients';

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';

const createInvalidRefreshTokenError = (): ErrorWithStatusCode =>
	createError(403, INVALID_REFRESH_TOKEN_MESSAGE);

const logRefreshTokenFailure = (reason: string, metadata: Record<string, string>): void => {
	logger.warn('Refresh token validation failed', {
		reason,
		...metadata,
	});
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeUsername = (username: string): string => username.trim().toLowerCase();
const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const toPublicUser = (user: StoredUser): User => ({
	id: user.id,
	email: user.email,
	username: user.username,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
});

const toStoredUser = (row: DatabaseUserRow): StoredUser => ({
	id: row.id,
	email: row.email,
	username: row.username,
	passwordHash: row.password_hash,
	createdAt: row.created_at.toISOString(),
	updatedAt: row.updated_at.toISOString(),
});

const toStoredRefreshToken = (row: DatabaseRefreshTokenRow): StoredRefreshToken => ({
	id: row.id,
	userId: row.user_id,
	tokenFamilyId: row.token_family_id,
	tokenHash: row.token_hash,
	expiresAt: row.expires_at.toISOString(),
	createdAt: row.created_at.toISOString(),
	lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : null,
	revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
	replacedByTokenId: row.replaced_by_token_id,
	userAgent: row.user_agent,
	ipAddress: row.ip_address,
});

const signAccessToken = (userId: string): string =>
	jwt.sign({ userId, type: 'access' }, apiConfig.JWT_SECRET, {
		algorithm: 'HS256',
		expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
		issuer: jwtIssuer,
		audience: jwtAudience,
	});

const signRefreshToken = (userId: string, tokenId: string): string =>
	jwt.sign({ userId, type: 'refresh' }, apiConfig.JWT_SECRET, {
		algorithm: 'HS256',
		expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
		issuer: jwtIssuer,
		audience: jwtAudience,
		jwtid: tokenId,
	});

const verifyToken = (token: string, invalidStatusCode = 401): JwtPayload => {
	try {
		const decoded = jwt.verify(token, apiConfig.JWT_SECRET, {
			algorithms: ['HS256'],
			issuer: jwtIssuer,
			audience: jwtAudience,
		});

		if (typeof decoded === 'string') {
			throw createError(invalidStatusCode, 'Invalid token payload');
		}

		return decoded;
	} catch {
		throw createError(invalidStatusCode, 'Invalid or expired token');
	}
};

const getStringClaim = (payload: JwtPayload, claimName: string): string => {
	const value = payload[claimName];

	if (typeof value !== 'string' || value.trim().length === 0) {
		throw createError(403, 'Invalid refresh token payload');
	}

	return value.trim();
};

class MemoryAuthRepository implements AuthRepository {
	private readonly usersById = new Map<string, StoredUser>();
	private readonly userIdByEmail = new Map<string, string>();
	private readonly userIdByUsername = new Map<string, string>();
	private readonly refreshTokensById = new Map<string, StoredRefreshToken>();

	async findUserByEmail(email: string): Promise<StoredUser | null> {
		const userId = this.userIdByEmail.get(normalizeEmail(email));
		return userId ? (this.usersById.get(userId) ?? null) : null;
	}

	async findUserByUsername(username: string): Promise<StoredUser | null> {
		const userId = this.userIdByUsername.get(normalizeUsername(username));
		return userId ? (this.usersById.get(userId) ?? null) : null;
	}

	async findUserById(userId: string): Promise<StoredUser | null> {
		return this.usersById.get(userId) ?? null;
	}

	async createUser(user: {
		id: string;
		email: string;
		username: string;
		passwordHash: string;
		createdAt: string;
	}): Promise<StoredUser> {
		if (this.userIdByEmail.has(normalizeEmail(user.email)) || this.userIdByUsername.has(normalizeUsername(user.username))) {
			throw createError(400, 'Unable to create account');
		}

		const storedUser: StoredUser = {
			id: user.id,
			email: normalizeEmail(user.email),
			username: user.username.trim(),
			passwordHash: user.passwordHash,
			createdAt: user.createdAt,
			updatedAt: user.createdAt,
		};

		this.usersById.set(storedUser.id, storedUser);
		this.userIdByEmail.set(normalizeEmail(storedUser.email), storedUser.id);
		this.userIdByUsername.set(normalizeUsername(storedUser.username), storedUser.id);
		return storedUser;
	}

	async createRefreshToken(token: RefreshTokenCreation): Promise<void> {
		this.refreshTokensById.set(token.id, {
			id: token.id,
			userId: token.userId,
			tokenFamilyId: token.tokenFamilyId,
			tokenHash: token.tokenHash,
			expiresAt: token.expiresAt,
			createdAt: new Date().toISOString(),
			lastUsedAt: null,
			revokedAt: null,
			replacedByTokenId: null,
			userAgent: token.userAgent,
			ipAddress: token.ipAddress,
		});
	}

	async findRefreshTokenById(refreshTokenId: string): Promise<StoredRefreshToken | null> {
		return this.refreshTokensById.get(refreshTokenId) ?? null;
	}

	async listRefreshTokensByUserId(userId: string): Promise<StoredRefreshToken[]> {
		return Array.from(this.refreshTokensById.values())
			.filter((token) => token.userId === userId)
			.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
	}

	async revokeRefreshToken(refreshTokenId: string, replacedByTokenId: string | null): Promise<boolean> {
		const existing = this.refreshTokensById.get(refreshTokenId);

		if (!existing || existing.revokedAt) {
			return false;
		}

		this.refreshTokensById.set(refreshTokenId, {
			...existing,
			revokedAt: new Date().toISOString(),
			replacedByTokenId,
		});

		return true;
	}

	async revokeRefreshTokenFamily(userId: string, tokenFamilyId: string): Promise<number> {
		const now = new Date().toISOString();
		let revokedCount = 0;

		for (const [tokenId, token] of this.refreshTokensById.entries()) {
			if (token.userId === userId && token.tokenFamilyId === tokenFamilyId && !token.revokedAt) {
				this.refreshTokensById.set(tokenId, {
					...token,
					revokedAt: now,
				});
				revokedCount += 1;
			}
		}

		return revokedCount;
	}

	async revokeAllUserRefreshTokens(userId: string): Promise<number> {
		const now = new Date().toISOString();
		let revokedCount = 0;

		for (const [tokenId, token] of this.refreshTokensById.entries()) {
			if (token.userId === userId && !token.revokedAt) {
				this.refreshTokensById.set(tokenId, {
					...token,
					revokedAt: now,
				});
				revokedCount += 1;
			}
		}

		return revokedCount;
	}

	async rotateRefreshToken(oldTokenId: string, nextToken: RefreshTokenCreation): Promise<boolean> {
		const revoked = await this.revokeRefreshToken(oldTokenId, nextToken.id);

		if (!revoked) {
			return false;
		}

		await this.createRefreshToken(nextToken);
		return true;
	}

	async touchRefreshTokenUsage(refreshTokenId: string, timestampIso: string): Promise<void> {
		const existingToken = this.refreshTokensById.get(refreshTokenId);

		if (!existingToken) {
			return;
		}

		this.refreshTokensById.set(refreshTokenId, {
			...existingToken,
			lastUsedAt: timestampIso,
		});
	}
}

class PostgresAuthRepository implements AuthRepository {
	async findUserByEmail(email: string): Promise<StoredUser | null> {
		const result = await queryDatabase<DatabaseUserRow>(
			`SELECT id, email, username, password_hash, created_at, updated_at
			 FROM users
			 WHERE email = $1
			 LIMIT 1`,
			[normalizeEmail(email)],
		);

		return result.rows[0] ? toStoredUser(result.rows[0]) : null;
	}

	async findUserByUsername(username: string): Promise<StoredUser | null> {
		const result = await queryDatabase<DatabaseUserRow>(
			`SELECT id, email, username, password_hash, created_at, updated_at
			 FROM users
			 WHERE LOWER(username) = $1
			 LIMIT 1`,
			[normalizeUsername(username)],
		);

		return result.rows[0] ? toStoredUser(result.rows[0]) : null;
	}

	async findUserById(userId: string): Promise<StoredUser | null> {
		const result = await queryDatabase<DatabaseUserRow>(
			`SELECT id, email, username, password_hash, created_at, updated_at
			 FROM users
			 WHERE id = $1
			 LIMIT 1`,
			[userId],
		);

		return result.rows[0] ? toStoredUser(result.rows[0]) : null;
	}

	async createUser(user: {
		id: string;
		email: string;
		username: string;
		passwordHash: string;
		createdAt: string;
	}): Promise<StoredUser> {
		try {
			const result = await queryDatabase<DatabaseUserRow>(
				`INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $5)
				 RETURNING id, email, username, password_hash, created_at, updated_at`,
				[user.id, normalizeEmail(user.email), user.username.trim(), user.passwordHash, user.createdAt],
			);

			const created = result.rows[0];

			if (!created) {
				throw createError(500, 'Failed to create user');
			}

			return toStoredUser(created);
		} catch (error) {
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				(error as { code?: string }).code === '23505'
			) {
				throw createError(400, 'Unable to create account');
			}

			throw error;
		}
	}

	async createRefreshToken(token: RefreshTokenCreation): Promise<void> {
		await queryDatabase(
			`INSERT INTO refresh_tokens (
				id, user_id, token_family_id, token_hash, expires_at, user_agent, ip_address
			) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				token.id,
				token.userId,
				token.tokenFamilyId,
				token.tokenHash,
				token.expiresAt,
				token.userAgent,
				token.ipAddress,
			],
		);
	}

	async findRefreshTokenById(refreshTokenId: string): Promise<StoredRefreshToken | null> {
		const result = await queryDatabase<DatabaseRefreshTokenRow>(
			`SELECT id, user_id, token_family_id, token_hash, expires_at, created_at, last_used_at, revoked_at, replaced_by_token_id, user_agent, ip_address
			 FROM refresh_tokens
			 WHERE id = $1
			 LIMIT 1`,
			[refreshTokenId],
		);

		return result.rows[0] ? toStoredRefreshToken(result.rows[0]) : null;
	}

	async listRefreshTokensByUserId(userId: string): Promise<StoredRefreshToken[]> {
		const result = await queryDatabase<DatabaseRefreshTokenRow>(
			`SELECT id, user_id, token_family_id, token_hash, expires_at, created_at, last_used_at, revoked_at, replaced_by_token_id, user_agent, ip_address
			 FROM refresh_tokens
			 WHERE user_id = $1
			 ORDER BY created_at DESC`,
			[userId],
		);

		return result.rows.map((row) => toStoredRefreshToken(row));
	}

	async revokeRefreshToken(refreshTokenId: string, replacedByTokenId: string | null): Promise<boolean> {
		const result = await queryDatabase(
			`UPDATE refresh_tokens
			 SET revoked_at = NOW(), replaced_by_token_id = $2
			 WHERE id = $1 AND revoked_at IS NULL`,
			[refreshTokenId, replacedByTokenId],
		);

		return (result.rowCount ?? 0) > 0;
	}

	async revokeAllUserRefreshTokens(userId: string): Promise<number> {
		const result = await queryDatabase(
			`UPDATE refresh_tokens
			 SET revoked_at = NOW()
			 WHERE user_id = $1 AND revoked_at IS NULL`,
			[userId],
		);

		return result.rowCount ?? 0;
	}

	async revokeRefreshTokenFamily(userId: string, tokenFamilyId: string): Promise<number> {
		const result = await queryDatabase(
			`UPDATE refresh_tokens
			 SET revoked_at = NOW()
			 WHERE user_id = $1
			   AND token_family_id = $2
			   AND revoked_at IS NULL`,
			[userId, tokenFamilyId],
		);

		return result.rowCount ?? 0;
	}

	async rotateRefreshToken(oldTokenId: string, nextToken: RefreshTokenCreation): Promise<boolean> {
		return withDatabaseTransaction<boolean>(async (client) => {
			const revokeResult = await client.query(
				`UPDATE refresh_tokens
				 SET revoked_at = NOW(), replaced_by_token_id = $2
				 WHERE id = $1 AND revoked_at IS NULL`,
				[oldTokenId, nextToken.id],
			);

			if ((revokeResult.rowCount ?? 0) === 0) {
				return false;
			}

			await client.query(
				`INSERT INTO refresh_tokens (
					id, user_id, token_family_id, token_hash, expires_at, user_agent, ip_address
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					nextToken.id,
					nextToken.userId,
					nextToken.tokenFamilyId,
					nextToken.tokenHash,
					nextToken.expiresAt,
					nextToken.userAgent,
					nextToken.ipAddress,
				],
			);

			return true;
		});
	}

	async touchRefreshTokenUsage(refreshTokenId: string, timestampIso: string): Promise<void> {
		await queryDatabase(
			`UPDATE refresh_tokens
			 SET last_used_at = $2::timestamptz
			 WHERE id = $1`,
			[refreshTokenId, timestampIso],
		);
	}
}

const repository: AuthRepository = isPostgresStorageEnabled()
	? new PostgresAuthRepository()
	: new MemoryAuthRepository();

const buildRefreshTokenRecord = (
	userId: string,
	context: RefreshTokenContext,
	tokenFamilyId: string = randomUUID(),
): { refreshToken: string; tokenRecord: RefreshTokenCreation } => {
	const tokenId = randomUUID();
	const refreshToken = signRefreshToken(userId, tokenId);
	const tokenHash = hashRefreshToken(refreshToken);

	return {
		refreshToken,
		tokenRecord: {
			id: tokenId,
			userId,
			tokenFamilyId,
			tokenHash,
			expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1_000).toISOString(),
			userAgent: context.userAgent,
			ipAddress: context.ipAddress,
		},
	};
};

const issueTokenPair = async (userId: string, context: RefreshTokenContext): Promise<TokenPair> => {
	const accessToken = signAccessToken(userId);
	const refreshTokenEntry = buildRefreshTokenRecord(userId, context);
	await repository.createRefreshToken(refreshTokenEntry.tokenRecord);

	return {
		accessToken,
		refreshToken: refreshTokenEntry.refreshToken,
	};
};

const parseRefreshTokenPayload = (refreshToken: string): { userId: string; tokenId: string } => {
	try {
		const payload = verifyToken(refreshToken, 403);

		if (payload.type !== 'refresh') {
			throw createInvalidRefreshTokenError();
		}

		const userId = getStringClaim(payload, 'userId');
		const tokenId = typeof payload.jti === 'string' ? payload.jti : getStringClaim(payload, 'tokenId');

		return { userId, tokenId };
	} catch {
		throw createInvalidRefreshTokenError();
	}
};

const defaultRefreshTokenContext: RefreshTokenContext = {
	userAgent: null,
	ipAddress: null,
};

const writeAdminAuditLog = async ({
	action,
	targetUserId,
	context,
	revokedSessionCount,
	status,
	errorMessage,
}: {
	action: string;
	targetUserId: string;
	context: AdminAuditContext;
	revokedSessionCount: number;
	status: 'success' | 'failed';
	errorMessage?: string;
}): Promise<void> => {
	if (!isPostgresStorageEnabled()) {
		logger.info('Admin auth audit event', {
			action,
			targetUserId,
			actorIdentifier: context.actorIdentifier,
			actorType: context.actorType,
			actorIpAddress: context.actorIpAddress ?? 'unknown',
			status,
			revokedSessionCount,
			errorMessage: errorMessage ?? '',
		});
		return;
	}

	await queryDatabase(
		`INSERT INTO auth_admin_audit_logs (
			id,
			action,
			actor_type,
			actor_identifier,
			actor_ip_address,
			actor_user_agent,
			target_user_id,
			status,
			revoked_session_count,
			error_message
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		[
			randomUUID(),
			action,
			context.actorType,
			context.actorIdentifier,
			context.actorIpAddress,
			context.actorUserAgent,
			targetUserId,
			status,
			revokedSessionCount,
			errorMessage ?? null,
		],
	);
};

export const authService = {
	signup: async (payload: SignupPayload): Promise<SignupResult> => {
		const normalizedEmail = normalizeEmail(payload.email);
		const normalizedUsername = normalizeUsername(payload.username);

		const [existingByEmail, existingByUsername] = await Promise.all([
			repository.findUserByEmail(normalizedEmail),
			repository.findUserByUsername(normalizedUsername),
		]);

		if (existingByEmail || existingByUsername) {
			throw createError(400, 'Unable to create account');
		}

		const passwordHash = await bcrypt.hash(payload.password, PASSWORD_SALT_ROUNDS);
		const created = await repository.createUser({
			id: randomUUID(),
			email: normalizedEmail,
			username: payload.username.trim(),
			passwordHash,
			createdAt: new Date().toISOString(),
		});

		return { user: toPublicUser(created) };
	},

	login: async (
		payload: LoginPayload,
		context: RefreshTokenContext = defaultRefreshTokenContext,
	): Promise<AuthLoginResult> => {
		const user = await repository.findUserByEmail(payload.email);

		if (!user) {
			throw createError(401, 'Invalid email or password');
		}

		const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

		if (!isPasswordValid) {
			throw createError(401, 'Invalid email or password');
		}

		return {
			...(await issueTokenPair(user.id, context)),
			user: toPublicUser(user),
		};
	},

	refreshAccessToken: async (
		refreshToken: string,
		context: RefreshTokenContext = defaultRefreshTokenContext,
	): Promise<RefreshResult> => {
		const parsed = parseRefreshTokenPayload(refreshToken);
		const storedToken = await repository.findRefreshTokenById(parsed.tokenId);

		if (!storedToken || storedToken.userId !== parsed.userId) {
			logRefreshTokenFailure('token_not_found_or_user_mismatch', {
				tokenId: parsed.tokenId,
				userId: parsed.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		if (storedToken.revokedAt) {
			await repository.revokeAllUserRefreshTokens(storedToken.userId);
			logRefreshTokenFailure('token_reuse_detected', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		if (Date.parse(storedToken.expiresAt) <= Date.now()) {
			await repository.revokeRefreshToken(storedToken.id, null);
			logRefreshTokenFailure('token_expired', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		if (storedToken.tokenHash !== hashRefreshToken(refreshToken)) {
			await repository.revokeAllUserRefreshTokens(storedToken.userId);
			logRefreshTokenFailure('token_hash_mismatch', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		const user = await repository.findUserById(storedToken.userId);

		if (!user) {
			await repository.revokeAllUserRefreshTokens(storedToken.userId);
			logRefreshTokenFailure('user_not_found', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		await repository.touchRefreshTokenUsage(storedToken.id, new Date().toISOString());

		const rotatedRefreshToken = buildRefreshTokenRecord(user.id, context, storedToken.tokenFamilyId);
		const didRotate = await repository.rotateRefreshToken(storedToken.id, rotatedRefreshToken.tokenRecord);

		if (!didRotate) {
			logRefreshTokenFailure('rotation_conflict', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			throw createInvalidRefreshTokenError();
		}

		return {
			accessToken: signAccessToken(user.id),
			refreshToken: rotatedRefreshToken.refreshToken,
		};
	},

	logout: async (refreshToken: string): Promise<void> => {
		let parsed: { userId: string; tokenId: string };

		try {
			parsed = parseRefreshTokenPayload(refreshToken);
		} catch {
			logRefreshTokenFailure('logout_invalid_token_payload', {
				tokenId: 'unknown',
				userId: 'unknown',
			});
			return;
		}

		const storedToken = await repository.findRefreshTokenById(parsed.tokenId);

		if (!storedToken || storedToken.userId !== parsed.userId) {
			logRefreshTokenFailure('logout_token_not_found_or_user_mismatch', {
				tokenId: parsed.tokenId,
				userId: parsed.userId,
			});
			return;
		}

		if (storedToken.tokenHash !== hashRefreshToken(refreshToken)) {
			await repository.revokeAllUserRefreshTokens(storedToken.userId);
			logRefreshTokenFailure('logout_token_hash_mismatch', {
				tokenId: storedToken.id,
				userId: storedToken.userId,
			});
			return;
		}

		await repository.revokeRefreshToken(storedToken.id, null);
	},

	listSessions: async (userId: string): Promise<AuthSessionTelemetry[]> => {
		const user = await repository.findUserById(userId);

		if (!user) {
			throw createError(401, 'Unauthorized');
		}

		const refreshTokens = await repository.listRefreshTokensByUserId(user.id);
		const nowTimestamp = Date.now();
		const sessionsByFamilyId = new Map<string, StoredRefreshToken>();

		for (const token of refreshTokens) {
			const existingSession = sessionsByFamilyId.get(token.tokenFamilyId);

			if (!existingSession || Date.parse(token.createdAt) > Date.parse(existingSession.createdAt)) {
				sessionsByFamilyId.set(token.tokenFamilyId, token);
			}
		}

		return Array.from(sessionsByFamilyId.values())
			.map((session) => {
				const isExpired = Date.parse(session.expiresAt) <= nowTimestamp;
				const status: AuthSessionTelemetry['status'] = session.revokedAt
					? 'revoked'
					: isExpired
						? 'expired'
						: 'active';

				return {
					sessionId: session.tokenFamilyId,
					userId: session.userId,
					latestTokenId: session.id,
					status,
					createdAt: session.createdAt,
					lastUsedAt: session.lastUsedAt,
					expiresAt: session.expiresAt,
					revokedAt: session.revokedAt,
					userAgent: session.userAgent,
					ipAddress: session.ipAddress,
				};
			})
			.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
	},

	revokeSession: async (userId: string, sessionId: string): Promise<void> => {
		const revokedCount = await repository.revokeRefreshTokenFamily(userId, sessionId);

		if (revokedCount === 0) {
			throw createError(404, 'Session not found');
		}
	},

	revokeAllSessions: async (userId: string): Promise<void> => {
		await repository.revokeAllUserRefreshTokens(userId);
	},

	adminRevokeUserSessions: async (userId: string, context: AdminAuditContext): Promise<void> => {
		let revokedSessionCount = 0;

		try {
			revokedSessionCount = await repository.revokeAllUserRefreshTokens(userId);

			await writeAdminAuditLog({
				action: 'admin_revoke_all_sessions',
				targetUserId: userId,
				context,
				revokedSessionCount,
				status: 'success',
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown admin revocation failure';

			await writeAdminAuditLog({
				action: 'admin_revoke_all_sessions',
				targetUserId: userId,
				context,
				revokedSessionCount,
				status: 'failed',
				errorMessage: message,
			});

			throw error;
		}
	},

	getCurrentUser: async (userId: string): Promise<User> => {
		const user = await repository.findUserById(userId);

		if (!user) {
			throw createError(401, 'User not found');
		}

		return toPublicUser(user);
	},

	authenticateAccessToken: async (accessToken: string): Promise<User> => {
		const payload = verifyToken(accessToken);

		if (payload.type !== 'access') {
			throw createError(401, 'Invalid access token');
		}

		const userId = payload.userId;

		if (typeof userId !== 'string' || userId.trim().length === 0) {
			throw createError(401, 'Invalid access token payload');
		}

		return authService.getCurrentUser(userId);
	},
};
