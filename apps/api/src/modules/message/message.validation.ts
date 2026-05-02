import { z } from 'zod';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const MESSAGE_MAX_LENGTH = 2000;

export interface CreateMessagePayload {
	chatId: string;
	content: string;
	type?: 'TEXT' | 'IMAGE' | 'FILE';
}

export interface MessageChatPathParams {
	chatId: string;
}

export interface MessagePaginationQuery {
	page: number;
	limit: number;
}

const createMessageSchema = z.object({
	chatId: z.string().uuid('chatId must be a valid UUID'),
	content: z
		.string()
		.trim()
		.min(1, 'content is required')
		.max(MESSAGE_MAX_LENGTH, `content must be at most ${MESSAGE_MAX_LENGTH} characters`),
	type: z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
});

const messageChatPathParamsSchema = z.object({
	chatId: z.string().uuid('chatId must be a valid UUID'),
});

const getFirstStringValue = (value: unknown): string | undefined => {
	if (typeof value === 'string') {
		return value;
	}

	if (Array.isArray(value) && typeof value[0] === 'string') {
		return value[0];
	}

	return undefined;
};

const messagePaginationSchema = z.object({
	page: z
		.preprocess((value) => getFirstStringValue(value) ?? '1', z.coerce.number().int().min(1))
		.default(1),
	limit: z
		.preprocess((value) => getFirstStringValue(value) ?? '20', z.coerce.number().int().min(1).max(100))
		.default(20),
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

export const parseCreateMessagePayload = (payload: unknown): CreateMessagePayload =>
	parseWithSchema(createMessageSchema, payload);

export const parseMessageChatPathParams = (payload: unknown): MessageChatPathParams =>
	parseWithSchema(messageChatPathParamsSchema, payload);

export const parseMessagePaginationQuery = (payload: unknown): MessagePaginationQuery =>
	parseWithSchema(messagePaginationSchema, payload);
