import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { isPostgresStorageEnabled, queryDatabase } from '../../config/db';
import { apiConfig } from '../../config/env';
import { authService } from './auth.service';

export interface AuthenticatedUser {
	userId: string;
}

export interface AdminAuthContext {
	actorType: 'api_key';
	actorIdentifier: string;
	actorIpAddress: string | null;
	actorUserAgent: string | null;
}

declare module 'express-serve-static-core' {
	interface Request {
		authUser?: AuthenticatedUser;
		authAdmin?: AdminAuthContext;
	}
}

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createUnauthorizedError = (): ErrorWithStatusCode => {
	const error = new Error('Unauthorized') as ErrorWithStatusCode;
	error.statusCode = 401;
	return error;
};

const extractBearerToken = (authorizationHeader: string | undefined): string => {
	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		throw createUnauthorizedError();
	}

	const token = authorizationHeader.replace('Bearer ', '').trim();

	if (token.length === 0) {
		throw createUnauthorizedError();
	}

	return token;
};

const normalizeIpCandidate = (candidate: string | null | undefined): string | null => {
	if (!candidate) {
		return null;
	}

	const normalized = candidate.trim();

	if (normalized.length === 0) {
		return null;
	}

	const forwardedValue = normalized.split(',')[0]?.trim() ?? '';

	if (forwardedValue.length === 0) {
		return null;
	}

	const withoutPort = forwardedValue.startsWith('[')
		? forwardedValue.replace(/^\[|\]$/g, '')
		: forwardedValue.replace(/:\d+$/, '');

	return withoutPort.trim().length > 0 ? withoutPort.trim() : null;
};

const getClientIpAddress = (
	request: Parameters<RequestHandler>[0],
): string => {
	const trustedProxyChain = request.ips.map((ipAddress) => normalizeIpCandidate(ipAddress)).filter(
		(ipAddress): ipAddress is string => typeof ipAddress === 'string',
	);
	const directIp = normalizeIpCandidate(request.ip);
	const forwardedFor = apiConfig.trustProxy ? normalizeIpCandidate(request.get('x-forwarded-for')) : null;
	const socketIp = normalizeIpCandidate(request.socket.remoteAddress);

	return (
		trustedProxyChain[0] ??
		directIp ??
		forwardedFor ??
		socketIp ??
		'unknown'
	);
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== 'object') {
		return null;
	}

	return value as Record<string, unknown>;
};

const extractNormalizedEmailFromBody = (body: unknown): string | null => {
	const record = asRecord(body);

	if (!record) {
		return null;
	}

	const email = record.email;

	if (typeof email !== 'string') {
		return null;
	}

	const normalizedEmail = email.trim().toLowerCase();
	return normalizedEmail.length > 0 ? normalizedEmail : null;
};

const extractRefreshTokenFingerprintFromBody = (body: unknown): string | null => {
	const record = asRecord(body);

	if (!record) {
		return null;
	}

	const refreshToken = record.refreshToken;

	if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
		return null;
	}

	return createHash('sha256').update(refreshToken).digest('hex').slice(0, 24);
};

export const authMiddleware: RequestHandler = async (request, response, next) => {
	try {
		const accessToken = extractBearerToken(request.headers.authorization);
		const authenticatedUser = await authService.authenticateAccessToken(accessToken);

		request.authUser = {
			userId: authenticatedUser.id,
		};

		next();
	} catch (error) {
		next(error);
	}
};

const inMemoryRateBuckets = new Map<string, { count: number; expiresAt: number }>();

const incrementMemoryRateBucket = (key: string, windowMs: number): number => {
	const now = Date.now();
	const existing = inMemoryRateBuckets.get(key);

	if (!existing || existing.expiresAt <= now) {
		inMemoryRateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
		return 1;
	}

	const nextCount = existing.count + 1;
	inMemoryRateBuckets.set(key, { ...existing, count: nextCount });
	return nextCount;
};

const incrementDatabaseRateBucket = async (
	routeKey: string,
	identifier: string,
	windowMs: number,
): Promise<number> => {
	const windowStartMilliseconds = Math.floor(Date.now() / windowMs) * windowMs;
	const windowStartIso = new Date(windowStartMilliseconds).toISOString();

	const result = await queryDatabase<{ attempt_count: number }>(
		`INSERT INTO auth_rate_limits (route_key, identifier, window_start, attempt_count, updated_at)
		 VALUES ($1, $2, $3::timestamptz, 1, NOW())
		 ON CONFLICT (route_key, identifier, window_start)
		 DO UPDATE SET attempt_count = auth_rate_limits.attempt_count + 1, updated_at = NOW()
		 RETURNING attempt_count`,
		[routeKey, identifier, windowStartIso],
	);

	const row = result.rows[0];

	if (!row) {
		throw new Error('Failed to increment rate-limit bucket');
	}

	return row.attempt_count;
};

const createRateLimitError = (): ErrorWithStatusCode => {
	const error = new Error('Too many requests') as ErrorWithStatusCode;
	error.statusCode = 429;
	return error;
};

const createAuthRateLimitMiddleware = (
	routeKey: string,
	maxAttempts: number,
	windowMs: number,
	extractCompositeIdentifier?: (request: Parameters<RequestHandler>[0]) => string | null,
): RequestHandler => async (request, _response, next) => {
	try {
		const requestIp = getClientIpAddress(request);
		const identifiers = new Set<string>([`ip:${requestIp}`]);
		const compositeIdentifier = extractCompositeIdentifier ? extractCompositeIdentifier(request) : null;

		if (compositeIdentifier) {
			identifiers.add(compositeIdentifier);
		}

		for (const identifier of identifiers) {
			const attempts = isPostgresStorageEnabled()
				? await incrementDatabaseRateBucket(routeKey, identifier, windowMs)
				: incrementMemoryRateBucket(`${routeKey}:${identifier}`, windowMs);

			if (attempts > maxAttempts) {
				throw createRateLimitError();
			}
		}

		next();
	} catch (error) {
		next(error);
	}
};

export const loginRateLimitMiddleware = createAuthRateLimitMiddleware(
	'auth-login',
	apiConfig.authLoginRateLimitMax,
	apiConfig.authRateLimitWindowMs,
	(request) => {
		const email = extractNormalizedEmailFromBody(request.body);
		return email ? `account:${email}` : null;
	},
);

export const refreshRateLimitMiddleware = createAuthRateLimitMiddleware(
	'auth-refresh',
	apiConfig.authRefreshRateLimitMax,
	apiConfig.authRateLimitWindowMs,
	(request) => {
		const tokenFingerprint = extractRefreshTokenFingerprintFromBody(request.body);
		return tokenFingerprint ? `token:${tokenFingerprint}` : null;
	},
);

const createForbiddenError = (message = 'Forbidden'): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = 403;
	return error;
};

const safeCompareSecrets = (providedValue: string, expectedValue: string): boolean => {
	const providedDigest = createHash('sha256').update(providedValue).digest();
	const expectedDigest = createHash('sha256').update(expectedValue).digest();

	return timingSafeEqual(providedDigest, expectedDigest) && providedValue.length === expectedValue.length;
};

const buildAdminContext = (
	request: Parameters<RequestHandler>[0],
	providedApiKey: string,
): AdminAuthContext => ({
	actorType: 'api_key',
	actorIdentifier: createHash('sha256').update(providedApiKey).digest('hex').slice(0, 16),
	actorIpAddress: getClientIpAddress(request),
	actorUserAgent: request.get('user-agent')?.trim() || null,
});

export const adminApiKeyMiddleware: RequestHandler = (request, _response, next) => {
	try {
		if (apiConfig.authAdminApiKey.length === 0) {
			throw createForbiddenError();
		}

		const providedApiKey = request.get('x-admin-api-key')?.trim() ?? '';

		if (
			providedApiKey.length === 0 ||
			!safeCompareSecrets(providedApiKey, apiConfig.authAdminApiKey)
		) {
			throw createForbiddenError();
		}

		request.authAdmin = buildAdminContext(request, providedApiKey);
		next();
	} catch (error) {
		next(error);
	}
};
