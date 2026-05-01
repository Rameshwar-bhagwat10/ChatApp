import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

const shouldRunRealPostgresTest = process.env.AUTH_REAL_POSTGRES_TEST === '1';

if (!shouldRunRealPostgresTest) {
	test('Real postgres auth integration is skipped', { skip: true }, () => {
		assert.equal(true, true);
	});
} else {
	process.env.AUTH_STORAGE_BACKEND = 'postgres';
	process.env.AUTH_TRUST_PROXY = process.env.AUTH_TRUST_PROXY ?? 'true';
	process.env.AUTH_LOGIN_RATE_LIMIT_MAX = process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? '20';
	process.env.AUTH_REFRESH_RATE_LIMIT_MAX = process.env.AUTH_REFRESH_RATE_LIMIT_MAX ?? '20';
	process.env.AUTH_RATE_LIMIT_WINDOW_MS = process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? '60000';
	process.env.AUTH_ADMIN_API_KEY =
		process.env.AUTH_ADMIN_API_KEY ?? 'real-postgres-admin-api-key-with-32-characters';

	const databaseUrl = process.env.DATABASE_URL ?? '';

	if (databaseUrl.trim().length === 0 || databaseUrl.startsWith('pg-mem://')) {
		test('Real postgres auth integration requires real DATABASE_URL', { skip: true }, () => {
			assert.equal(true, true);
		});
	} else {
		let initialized = false;

		const getApp = async () => {
			if (!initialized) {
				const { initializeDatabase } = await import('../../config/db');
				await initializeDatabase();
				initialized = true;
			}

			return (await import('../../app')).app;
		};

		test('Real postgres auth integration flow', async () => {
			const app = await getApp();
			const suffix = `real-${Date.now()}`;
			const signupPayload = {
				email: `user.${suffix}@example.com`,
				username: `user_${suffix}`,
				password: 'password123',
			};

			const signupResponse = await request(app).post('/api/v1/auth/signup').send(signupPayload);
			assert.equal(signupResponse.status, 201);

			const loginResponse = await request(app)
				.post('/api/v1/auth/login')
				.set('x-forwarded-for', '10.10.10.10')
				.send({
					email: signupPayload.email,
					password: signupPayload.password,
				});

			assert.equal(loginResponse.status, 200);
			assert.equal(typeof loginResponse.body.accessToken, 'string');
			assert.equal(typeof loginResponse.body.refreshToken, 'string');
			assert.equal(typeof loginResponse.body.user.id, 'string');

			const meResponse = await request(app)
				.get('/api/v1/auth/me')
				.set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
			assert.equal(meResponse.status, 200);
			assert.equal(meResponse.body.email, signupPayload.email);

			const refreshResponse = await request(app)
				.post('/api/v1/auth/refresh')
				.set('x-forwarded-for', '10.10.10.11')
				.send({
					refreshToken: loginResponse.body.refreshToken,
				});
			assert.equal(refreshResponse.status, 200);
			assert.equal(typeof refreshResponse.body.accessToken, 'string');
			assert.equal(typeof refreshResponse.body.refreshToken, 'string');

			const revokeAllResponse = await request(app)
				.post(`/api/v1/auth/admin/users/${loginResponse.body.user.id}/sessions/revoke-all`)
				.set('x-admin-api-key', process.env.AUTH_ADMIN_API_KEY ?? '');
			assert.equal(revokeAllResponse.status, 200);

			const refreshAfterRevokeResponse = await request(app)
				.post('/api/v1/auth/refresh')
				.send({
					refreshToken: refreshResponse.body.refreshToken,
				});
			assert.equal(refreshAfterRevokeResponse.status, 403);
		});
	}
}
