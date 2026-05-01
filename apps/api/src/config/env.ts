import { loadEnvironment } from '@chat-app/config';

const toPort = (rawPort: string | undefined, fallback: number): number => {
	const parsedPort = Number(rawPort);

	if (Number.isNaN(parsedPort) || parsedPort <= 0) {
		return fallback;
	}

	return parsedPort;
};

const toPositiveInteger = (rawValue: string | undefined, fallback: number): number => {
	const parsedValue = Number.parseInt(rawValue ?? '', 10);

	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		return fallback;
	}

	return parsedValue;
};

const toTrustProxySetting = (rawValue: string | undefined): boolean | number => {
	const normalized = rawValue?.trim().toLowerCase();

	if (!normalized || normalized === 'false' || normalized === '0') {
		return false;
	}

	if (normalized === 'true') {
		return true;
	}

	const parsedNumber = Number.parseInt(normalized, 10);

	if (Number.isInteger(parsedNumber) && parsedNumber >= 0) {
		return parsedNumber;
	}

	throw new Error(`Invalid AUTH_TRUST_PROXY value: ${rawValue}`);
};

const sharedEnv = loadEnvironment({
	requiredKeys: ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'NEXT_PUBLIC_API_URL'],
});

const MINIMUM_JWT_SECRET_LENGTH = 32;
const INSECURE_DEFAULT_JWT_SECRET = 'change-me-in-production';
const AUTH_STORAGE_BACKENDS = ['postgres', 'memory'] as const;
type AuthStorageBackend = (typeof AUTH_STORAGE_BACKENDS)[number];

const normalizeAuthStorageBackend = (rawBackend: string | undefined): AuthStorageBackend => {
	const backend = rawBackend?.trim().toLowerCase() ?? 'postgres';

	if (!AUTH_STORAGE_BACKENDS.includes(backend as AuthStorageBackend)) {
		throw new Error(`Unsupported AUTH_STORAGE_BACKEND value: ${rawBackend ?? '<empty>'}`);
	}

	if (backend === 'memory' && process.env.NODE_ENV === 'production') {
		throw new Error('AUTH_STORAGE_BACKEND=memory is not allowed in production');
	}

	return backend as AuthStorageBackend;
};

const assertJwtSecretIsStrong = (secret: string): void => {
	if (secret === INSECURE_DEFAULT_JWT_SECRET) {
		throw new Error('JWT_SECRET uses insecure default value');
	}

	if (secret.length < MINIMUM_JWT_SECRET_LENGTH) {
		throw new Error(`JWT_SECRET must be at least ${MINIMUM_JWT_SECRET_LENGTH} characters long`);
	}
};

const authStorageBackend = normalizeAuthStorageBackend(process.env.AUTH_STORAGE_BACKEND);
assertJwtSecretIsStrong(sharedEnv.JWT_SECRET);

const trustProxy = toTrustProxySetting(process.env.AUTH_TRUST_PROXY);
const authLoginRateLimitMax = toPositiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 10);
const authRefreshRateLimitMax = toPositiveInteger(process.env.AUTH_REFRESH_RATE_LIMIT_MAX, 30);
const authRateLimitWindowMs = toPositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1_000);
const authCleanupIntervalMs = toPositiveInteger(process.env.AUTH_CLEANUP_INTERVAL_MS, 60 * 60 * 1_000);
const authRateLimitRetentionMs = toPositiveInteger(
	process.env.AUTH_RATE_LIMIT_RETENTION_MS,
	24 * 60 * 60 * 1_000,
);
const authRefreshTokenRetentionMs = toPositiveInteger(
	process.env.AUTH_REFRESH_TOKEN_RETENTION_MS,
	30 * 24 * 60 * 60 * 1_000,
);
const authAdminApiKey = process.env.AUTH_ADMIN_API_KEY?.trim() || '';

if (process.env.NODE_ENV === 'production' && authAdminApiKey.length < 32) {
	throw new Error('AUTH_ADMIN_API_KEY must be set to at least 32 characters in production');
}

export const apiConfig = {
	...sharedEnv,
	authAdminApiKey,
	authCleanupIntervalMs,
	authLoginRateLimitMax,
	authRateLimitRetentionMs,
	authRateLimitWindowMs,
	authRefreshRateLimitMax,
	authRefreshTokenRetentionMs,
	authStorageBackend,
	port: toPort(process.env.API_PORT, 4000),
	trustProxy,
};
