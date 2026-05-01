import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.JWT_SECRET =
	process.env.JWT_SECRET ?? 'test-jwt-secret-for-auth-module-with-32-plus-characters';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'pg-mem://auth-test-db';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
process.env.AUTH_STORAGE_BACKEND = 'postgres';
process.env.AUTH_TRUST_PROXY = 'true';
process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2';
process.env.AUTH_REFRESH_RATE_LIMIT_MAX = '2';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
process.env.AUTH_ADMIN_API_KEY = 'test-admin-api-key-minimum-32-characters';

let initialized = false;

const getApp = async () => {
	if (!initialized) {
		const { initializeDatabase } = await import('../../config/db');
		await initializeDatabase();
		initialized = true;
	}

	return (await import('../../app')).app;
};

const createSignupPayload = (suffix: string) => ({
	email: `user.${suffix}@example.com`,
	username: `user_${suffix}`,
	password: 'password123',
});

let ipCounter = 10;
const uniqueClientIp = (): string => {
	ipCounter += 1;
	return `10.0.0.${ipCounter}`;
};

test('POST /api/v1/auth/signup creates user and omits password', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`signup-${Date.now()}`);

	const response = await request(app).post('/api/v1/auth/signup').send(payload);

	assert.equal(response.status, 201);
	assert.equal(response.body.user.email, payload.email);
	assert.equal(response.body.user.username, payload.username);
	assert.equal(typeof response.body.user.id, 'string');
	assert.equal(Object.hasOwn(response.body.user, 'password'), false);
	assert.equal(Object.hasOwn(response.body.user, 'passwordHash'), false);
});

test('POST /api/v1/auth/login rejects wrong password', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`wrong-pass-${Date.now()}`);
	const testIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const response = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', testIp)
		.send({
			email: payload.email,
			password: 'wrong-password',
		});

	assert.equal(response.status, 401);
	assert.equal(response.body.message, 'Invalid email or password');
});

test('POST /api/v1/auth/login returns access and refresh tokens', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`login-${Date.now()}`);
	const testIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const response = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', testIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	assert.equal(response.status, 200);
	assert.equal(typeof response.body.accessToken, 'string');
	assert.equal(typeof response.body.refreshToken, 'string');
	assert.equal(response.body.user.email, payload.email);
});

test('GET /api/v1/auth/me blocks unauthorized users', async () => {
	const app = await getApp();
	const response = await request(app).get('/api/v1/auth/me');

	assert.equal(response.status, 401);
});

test('GET /api/v1/auth/me returns authenticated user for valid access token', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`me-${Date.now()}`);
	const testIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', testIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const meResponse = await request(app)
		.get('/api/v1/auth/me')
		.set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

	assert.equal(meResponse.status, 200);
	assert.equal(meResponse.body.email, payload.email);
});

test('POST /api/v1/auth/refresh rotates refresh token and invalidates old token', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`refresh-${Date.now()}`);
	const loginIp = uniqueClientIp();
	const refreshIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', loginIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const refreshResponse = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', refreshIp)
		.send({
			refreshToken: loginResponse.body.refreshToken,
		});

	assert.equal(refreshResponse.status, 200);
	assert.equal(typeof refreshResponse.body.accessToken, 'string');
	assert.equal(typeof refreshResponse.body.refreshToken, 'string');
	assert.notEqual(refreshResponse.body.refreshToken, loginResponse.body.refreshToken);

	const reusedTokenResponse = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', refreshIp)
		.send({
			refreshToken: loginResponse.body.refreshToken,
		});

	assert.equal(reusedTokenResponse.status, 403);
	assert.equal(reusedTokenResponse.body.message, 'Invalid refresh token');
});

test('POST /api/v1/auth/logout invalidates refresh token', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`logout-${Date.now()}`);
	const loginIp = uniqueClientIp();
	const refreshIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', loginIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const logoutResponse = await request(app).post('/api/v1/auth/logout').send({
		refreshToken: loginResponse.body.refreshToken,
	});

	assert.equal(logoutResponse.status, 200);
	assert.equal(logoutResponse.body.success, true);

	const refreshAfterLogoutResponse = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', refreshIp)
		.send({
			refreshToken: loginResponse.body.refreshToken,
		});

	assert.equal(refreshAfterLogoutResponse.status, 403);
});

test('POST /api/v1/auth/logout is idempotent for invalid refresh token', async () => {
	const app = await getApp();

	const logoutResponse = await request(app).post('/api/v1/auth/logout').send({
		refreshToken: 'invalid-refresh-token',
	});

	assert.equal(logoutResponse.status, 200);
	assert.equal(logoutResponse.body.success, true);
});

test('GET /api/v1/auth/sessions returns telemetry for authenticated user sessions', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`sessions-${Date.now()}`);
	const testIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', testIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const sessionsResponse = await request(app)
		.get('/api/v1/auth/sessions')
		.set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

	assert.equal(sessionsResponse.status, 200);
	assert.equal(Array.isArray(sessionsResponse.body.sessions), true);
	assert.equal(typeof sessionsResponse.body.sessions[0].sessionId, 'string');
});

test('POST /api/v1/auth/sessions/revoke-all revokes current user sessions', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`revoke-all-${Date.now()}`);
	const loginIp = uniqueClientIp();
	const refreshIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', loginIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const revokeResponse = await request(app)
		.post('/api/v1/auth/sessions/revoke-all')
		.set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

	assert.equal(revokeResponse.status, 200);

	const refreshAfterRevoke = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', refreshIp)
		.send({
			refreshToken: loginResponse.body.refreshToken,
		});

	assert.equal(refreshAfterRevoke.status, 403);
	assert.equal(refreshAfterRevoke.body.message, 'Invalid refresh token');
});

test('POST /api/v1/auth/admin/users/:userId/sessions/revoke-all revokes user sessions', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`admin-revoke-${Date.now()}`);
	const loginIp = uniqueClientIp();
	const refreshIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', loginIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const adminRevokeResponse = await request(app)
		.post(`/api/v1/auth/admin/users/${loginResponse.body.user.id}/sessions/revoke-all`)
		.set('x-admin-api-key', process.env.AUTH_ADMIN_API_KEY ?? '');

	assert.equal(adminRevokeResponse.status, 200);

	const refreshAfterAdminRevoke = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', refreshIp)
		.send({
			refreshToken: loginResponse.body.refreshToken,
		});

	assert.equal(refreshAfterAdminRevoke.status, 403);
	assert.equal(refreshAfterAdminRevoke.body.message, 'Invalid refresh token');
});

test('POST /api/v1/auth/admin/users/:userId/sessions/revoke-all writes audit log entry', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`audit-${Date.now()}`);
	const loginIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', loginIp)
		.send({
			email: payload.email,
			password: payload.password,
		});

	const adminRevokeResponse = await request(app)
		.post(`/api/v1/auth/admin/users/${loginResponse.body.user.id}/sessions/revoke-all`)
		.set('x-admin-api-key', process.env.AUTH_ADMIN_API_KEY ?? '')
		.set('x-forwarded-for', '10.20.30.40')
		.set('user-agent', 'auth-audit-test-agent');

	assert.equal(adminRevokeResponse.status, 200);

	const { queryDatabase } = await import('../../config/db');
	const auditResult = await queryDatabase<{
		action: string;
		status: string;
		actor_identifier: string;
		actor_ip_address: string | null;
	}>(`SELECT action, status, actor_identifier, actor_ip_address
		FROM auth_admin_audit_logs
		WHERE target_user_id = $1
		ORDER BY created_at DESC
		LIMIT 1`, [loginResponse.body.user.id]);

	assert.equal(auditResult.rows.length, 1);
	assert.equal(auditResult.rows[0]?.action, 'admin_revoke_all_sessions');
	assert.equal(auditResult.rows[0]?.status, 'success');
	assert.equal(typeof auditResult.rows[0]?.actor_identifier, 'string');
	assert.equal(auditResult.rows[0]?.actor_ip_address, '10.20.30.40');
});

test('POST /api/v1/auth/login returns 429 after exceeding login rate limit', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`login-rate-limit-${Date.now()}`);
	const rateLimitIp = uniqueClientIp();

	await request(app).post('/api/v1/auth/signup').send(payload);

	await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', rateLimitIp)
		.send({ email: payload.email, password: 'wrong-password' });

	await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', rateLimitIp)
		.send({ email: payload.email, password: 'wrong-password' });

	const rateLimitedResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', rateLimitIp)
		.send({ email: payload.email, password: 'wrong-password' });

	assert.equal(rateLimitedResponse.status, 429);
	assert.equal(rateLimitedResponse.body.message, 'Too many requests');
});

test('POST /api/v1/auth/login rate limits by account across different IPs', async () => {
	const app = await getApp();
	const payload = createSignupPayload(`account-limit-${Date.now()}`);

	await request(app).post('/api/v1/auth/signup').send(payload);

	await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ email: payload.email, password: 'wrong-password' });

	await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ email: payload.email, password: 'wrong-password' });

	const rateLimitedResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ email: payload.email, password: 'wrong-password' });

	assert.equal(rateLimitedResponse.status, 429);
	assert.equal(rateLimitedResponse.body.message, 'Too many requests');
});

test('POST /api/v1/auth/refresh returns 429 after exceeding refresh rate limit', async () => {
	const app = await getApp();
	const rateLimitIp = uniqueClientIp();

	await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', rateLimitIp)
		.send({ refreshToken: 'invalid-token-value' });

	await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', rateLimitIp)
		.send({ refreshToken: 'invalid-token-value' });

	const rateLimitedResponse = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', rateLimitIp)
		.send({ refreshToken: 'invalid-token-value' });

	assert.equal(rateLimitedResponse.status, 429);
	assert.equal(rateLimitedResponse.body.message, 'Too many requests');
});

test('POST /api/v1/auth/refresh rate limits by token fingerprint across IPs', async () => {
	const app = await getApp();
	const refreshToken = `invalid-token-${Date.now()}`;

	await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ refreshToken });

	await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ refreshToken });

	const rateLimitedResponse = await request(app)
		.post('/api/v1/auth/refresh')
		.set('x-forwarded-for', uniqueClientIp())
		.send({ refreshToken });

	assert.equal(rateLimitedResponse.status, 429);
	assert.equal(rateLimitedResponse.body.message, 'Too many requests');
});
