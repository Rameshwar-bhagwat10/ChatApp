import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.JWT_SECRET =
	process.env.JWT_SECRET ?? 'test-jwt-secret-for-auth-module-with-32-plus-characters';
process.env.DATABASE_URL =
	process.env.DATABASE_URL ?? 'postgresql://chat_user:chat_password@localhost:5432/chat_app?schema=chat_app';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
process.env.AUTH_STORAGE_BACKEND = 'postgres';
process.env.AUTH_TRUST_PROXY = 'true';
process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2';
process.env.AUTH_REFRESH_RATE_LIMIT_MAX = '2';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
process.env.AUTH_ADMIN_API_KEY = 'test-admin-api-key-minimum-32-characters';

let initialized = false;
let uniqueCounter = 0;
let ipCounter = 100;

const getApp = async () => {
	if (!initialized) {
		const { initializeDatabase } = await import('../../config/db');
		await initializeDatabase();
		initialized = true;
	}

	return (await import('../../app')).app;
};

const uniqueSuffix = (prefix: string): string => {
	uniqueCounter += 1;
	return `${prefix.slice(0, 10)}-${Date.now().toString(36)}-${uniqueCounter.toString(36)}`;
};

const uniqueClientIp = (): string => {
	ipCounter += 1;
	return `10.10.0.${ipCounter}`;
};

interface TestUser {
	id: string;
	email: string;
	username: string;
	accessToken: string;
}

const createTestUser = async (prefix: string): Promise<TestUser> => {
	const app = await getApp();
	const suffix = uniqueSuffix(prefix);
	const password = 'password123';
	const email = `${suffix}@example.com`;
	const username = `u_${Date.now().toString(36)}${uniqueCounter.toString(36)}`;

	const signupResponse = await request(app).post('/api/v1/auth/signup').send({
		email,
		username,
		password,
	});

	assert.equal(signupResponse.status, 201);

	const loginResponse = await request(app)
		.post('/api/v1/auth/login')
		.set('x-forwarded-for', uniqueClientIp())
		.send({
			email,
			password,
		});

	assert.equal(loginResponse.status, 200);
	assert.equal(typeof loginResponse.body.accessToken, 'string');

	return {
		id: signupResponse.body.user.id,
		email,
		username,
		accessToken: loginResponse.body.accessToken,
	};
};

const createPrivateChat = async (owner: TestUser, otherUser: TestUser): Promise<string> => {
	const app = await getApp();
	const response = await request(app)
		.post('/api/v1/chats')
		.set('Authorization', `Bearer ${owner.accessToken}`)
		.send({
			type: 'PRIVATE',
			userIds: [owner.id, otherUser.id],
		});

	assert.equal(response.status, 201);
	return response.body.data.id as string;
};

test('POST /api/v1/chats creates private chat with ChatMember entries', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-private-owner');
	const peer = await createTestUser('phase5-private-peer');

	const response = await request(app)
		.post('/api/v1/chats')
		.set('Authorization', `Bearer ${owner.accessToken}`)
		.send({
			type: 'PRIVATE',
			userIds: [owner.id, peer.id],
		});

	assert.equal(response.status, 201);
	assert.equal(response.body.success, true);
	assert.equal(response.body.data.type, 'PRIVATE');
	assert.equal(Array.isArray(response.body.data.members), true);
	assert.equal(response.body.data.members.length, 2);
	const memberIds = response.body.data.members.map((member: { userId: string }) => member.userId);
	assert.equal(memberIds.includes(owner.id), true);
	assert.equal(memberIds.includes(peer.id), true);
});

test('POST /api/v1/chats creates group chat and marks creator as ADMIN', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-group-owner');
	const memberA = await createTestUser('phase5-group-a');
	const memberB = await createTestUser('phase5-group-b');

	const response = await request(app)
		.post('/api/v1/chats')
		.set('Authorization', `Bearer ${owner.accessToken}`)
		.send({
			type: 'GROUP',
			userIds: [owner.id, memberA.id, memberB.id],
		});

	assert.equal(response.status, 201);
	assert.equal(response.body.success, true);
	assert.equal(response.body.data.type, 'GROUP');
	assert.equal(response.body.data.members.length, 3);

	const ownerMembership = response.body.data.members.find(
		(member: { userId: string; role: string }) => member.userId === owner.id,
	);
	assert.equal(ownerMembership?.role, 'ADMIN');
});

test('POST /api/v1/messages sends message for chat members only', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-send-owner');
	const peer = await createTestUser('phase5-send-peer');
	const chatId = await createPrivateChat(owner, peer);

	const response = await request(app)
		.post('/api/v1/messages')
		.set('Authorization', `Bearer ${owner.accessToken}`)
		.send({
			chatId,
			content: 'Hello from test',
		});

	assert.equal(response.status, 201);
	assert.equal(response.body.success, true);
	assert.equal(response.body.data.chatId, chatId);
	assert.equal(response.body.data.senderId, owner.id);
	assert.equal(response.body.data.content, 'Hello from test');
	assert.equal(response.body.data.type, 'TEXT');
	assert.equal(Array.isArray(response.body.data.statuses), true);
	assert.equal(response.body.data.statuses.length, 2);
});

test('GET /api/v1/messages/:chatId returns paginated messages ordered ASC', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-pagination-owner');
	const peer = await createTestUser('phase5-pagination-peer');
	const chatId = await createPrivateChat(owner, peer);

	for (let index = 1; index <= 5; index += 1) {
		const createResponse = await request(app)
			.post('/api/v1/messages')
			.set('Authorization', `Bearer ${owner.accessToken}`)
			.send({
				chatId,
				content: `Message ${index}`,
			});

		assert.equal(createResponse.status, 201);
	}

	const response = await request(app)
		.get(`/api/v1/messages/${chatId}`)
		.query({ page: 2, limit: 2 })
		.set('Authorization', `Bearer ${owner.accessToken}`);

	assert.equal(response.status, 200);
	assert.equal(response.body.success, true);
	assert.equal(response.body.data.pagination.page, 2);
	assert.equal(response.body.data.pagination.limit, 2);
	assert.equal(response.body.data.pagination.total, 5);
	assert.equal(response.body.data.pagination.totalPages, 3);
	assert.equal(response.body.data.messages.length, 2);

	const timestamps = response.body.data.messages.map((message: { createdAt: string }) =>
		new Date(message.createdAt).getTime(),
	);
	assert.equal(timestamps[0] <= timestamps[1], true);
});

test('Unauthorized members are blocked from chat and message access', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-unauthorized-owner');
	const peer = await createTestUser('phase5-unauthorized-peer');
	const outsider = await createTestUser('phase5-unauthorized-outsider');
	const chatId = await createPrivateChat(owner, peer);

	const getChatResponse = await request(app)
		.get(`/api/v1/chats/${chatId}`)
		.set('Authorization', `Bearer ${outsider.accessToken}`);

	assert.equal(getChatResponse.status, 403);
	assert.equal(getChatResponse.body.success, false);
	assert.equal(getChatResponse.body.error.message, 'Forbidden');

	const sendMessageResponse = await request(app)
		.post('/api/v1/messages')
		.set('Authorization', `Bearer ${outsider.accessToken}`)
		.send({
			chatId,
			content: 'Unauthorized message',
		});

	assert.equal(sendMessageResponse.status, 403);
	assert.equal(sendMessageResponse.body.success, false);
	assert.equal(sendMessageResponse.body.error.message, 'Forbidden');

	const getMessagesResponse = await request(app)
		.get(`/api/v1/messages/${chatId}`)
		.query({ page: 1, limit: 20 })
		.set('Authorization', `Bearer ${outsider.accessToken}`);

	assert.equal(getMessagesResponse.status, 403);
	assert.equal(getMessagesResponse.body.success, false);
	assert.equal(getMessagesResponse.body.error.message, 'Forbidden');
});

test('POST /api/v1/chats rejects duplicate userIds', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-duplicate-owner');

	const response = await request(app)
		.post('/api/v1/chats')
		.set('Authorization', `Bearer ${owner.accessToken}`)
		.send({
			type: 'PRIVATE',
			userIds: [owner.id, owner.id],
		});

	assert.equal(response.status, 400);
	assert.equal(response.body.success, false);
	assert.equal(response.body.error.message, 'Duplicate userIds are not allowed');
});

test('GET /api/v1/messages/:chatId rejects invalid chatId', async () => {
	const app = await getApp();
	const owner = await createTestUser('phase5-invalid-chatid-owner');

	const response = await request(app)
		.get('/api/v1/messages/not-a-uuid')
		.query({ page: 1, limit: 20 })
		.set('Authorization', `Bearer ${owner.accessToken}`);

	assert.equal(response.status, 400);
	assert.equal(response.body.success, false);
	assert.equal(response.body.error.message, 'chatId must be a valid UUID');
});
