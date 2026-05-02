import type { RequestHandler } from 'express';
import { messageService, type CreateMessageInput } from './message.service';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const parseMessageType = (value: unknown): CreateMessageInput['type'] => {
	if (typeof value === 'string') {
		const normalized = value.trim().toUpperCase();
		if (normalized === 'TEXT' || normalized === 'IMAGE' || normalized === 'FILE') {
			return normalized;
		}
	}

	return 'TEXT';
};

const getQueryValue = (value: unknown): string | null => {
	if (typeof value === 'string') {
		return value;
	}

	if (Array.isArray(value) && typeof value[0] === 'string') {
		return value[0];
	}

	return null;
};

const parseCursor = (queryValue: unknown): string | null => {
	const value = getQueryValue(queryValue);
	if (!value) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
};

const parseLimit = (queryValue: unknown): number | undefined => {
	const value = getQueryValue(queryValue);

	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) ? parsed : undefined;
};

export const listMessagesController: RequestHandler = async (request, response, next) => {
	try {
		const chatId = request.params.chatId;

		if (!chatId) {
			response.status(400).json({ message: 'chatId is required' });
			return;
		}

		const page = await messageService.getMessagesByChat({
			chatId,
			cursor: parseCursor(request.query.cursor),
			limit: parseLimit(request.query.limit),
		});
		response.status(200).json(page);
	} catch (error) {
		next(error);
	}
};

export const createMessageController: RequestHandler = async (request, response, next) => {
	try {
		const chatId = request.params.chatId;
		const authenticatedUser = request.authUser;

		if (!chatId) {
			throw createError(400, 'chatId is required');
		}

		if (!authenticatedUser) {
			throw createError(401, 'Unauthorized');
		}

		const body = request.body as { content?: unknown; type?: unknown };

		if (typeof body.content !== 'string') {
			throw createError(400, 'content is required');
		}

		const message = await messageService.createMessage({
			chatId,
			senderId: authenticatedUser.userId,
			content: body.content,
			type: parseMessageType(body.type),
		});

		response.status(201).json(message);
	} catch (error) {
		next(error);
	}
};
