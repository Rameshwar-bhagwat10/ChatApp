import { z } from 'zod';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

export interface CreateChatPayload {
	type: 'PRIVATE' | 'GROUP';
	userIds: string[];
}

export interface ChatIdPathParams {
	id: string;
}

const createChatSchema = z
	.object({
		type: z.enum(['PRIVATE', 'GROUP']),
		userIds: z.array(z.string().uuid('Each userId must be a valid UUID')).min(2),
	})
	.superRefine((value, context) => {
		const uniqueUserIds = new Set(value.userIds);

		if (uniqueUserIds.size !== value.userIds.length) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['userIds'],
				message: 'Duplicate userIds are not allowed',
			});
		}

		if (value.type === 'PRIVATE' && value.userIds.length !== 2) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['userIds'],
				message: 'PRIVATE chat requires exactly 2 userIds',
			});
		}

		if (value.type === 'GROUP' && value.userIds.length < 2) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['userIds'],
				message: 'GROUP chat requires at least 2 userIds',
			});
		}
	});

const chatIdPathParamsSchema = z.object({
	id: z.string().uuid('Chat id must be a valid UUID'),
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

export const parseCreateChatPayload = (payload: unknown): CreateChatPayload =>
	parseWithSchema(createChatSchema, payload);

export const parseChatIdPathParams = (payload: unknown): ChatIdPathParams =>
	parseWithSchema(chatIdPathParamsSchema, payload);
