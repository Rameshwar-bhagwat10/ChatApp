import { z } from 'zod';

export interface SignupPayload {
	email: string;
	username: string;
	password: string;
}

export interface LoginPayload {
	email: string;
	password: string;
}

export interface RefreshTokenPayload {
	refreshToken: string;
}

export interface SessionRevokePayload {
	sessionId: string;
}

export interface UserPathParams {
	userId: string;
}

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const signupSchema = z.object({
	email: z.string().trim().email('Invalid email format'),
	username: z
		.string()
		.trim()
		.min(3, 'Username must be at least 3 characters long')
		.max(40, 'Username must be at most 40 characters long'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters long')
		.max(72, 'Password must be at most 72 characters long'),
});

const loginSchema = z.object({
	email: z.string().trim().email('Invalid email format'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters long')
		.max(72, 'Password must be at most 72 characters long'),
});

const refreshTokenSchema = z.object({
	refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

const sessionRevokeSchema = z.object({
	sessionId: z.string().uuid('Session ID must be a valid UUID'),
});

const userPathParamsSchema = z.object({
	userId: z.string().uuid('User ID must be a valid UUID'),
});

const createValidationError = (message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = 400;
	return error;
};

const parseWithSchema = <T>(schema: z.ZodSchema<T>, payload: unknown): T => {
	const parsed = schema.safeParse(payload);

	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message ?? 'Invalid request payload';
		throw createValidationError(message);
	}

	return parsed.data;
};

export const parseSignupPayload = (payload: unknown): SignupPayload =>
	parseWithSchema(signupSchema, payload);

export const parseLoginPayload = (payload: unknown): LoginPayload =>
	parseWithSchema(loginSchema, payload);

export const parseRefreshTokenPayload = (payload: unknown): RefreshTokenPayload =>
	parseWithSchema(refreshTokenSchema, payload);

export const parseSessionRevokePayload = (payload: unknown): SessionRevokePayload =>
	parseWithSchema(sessionRevokeSchema, payload);

export const parseUserPathParams = (payload: unknown): UserPathParams =>
	parseWithSchema(userPathParamsSchema, payload);
