import type { RequestHandler } from 'express';
import { messageService } from './message.service';

const DEFAULT_MESSAGE_PAGE_LIMIT = 60;
const MAX_MESSAGE_PAGE_LIMIT = 100;

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
	return value && value.trim().length > 0 ? value : null;
};

const parseLimit = (queryValue: unknown): number => {
	const value = getQueryValue(queryValue);

	if (!value) {
		return DEFAULT_MESSAGE_PAGE_LIMIT;
	}

	const parsed = Number.parseInt(value, 10);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		return DEFAULT_MESSAGE_PAGE_LIMIT;
	}

	return Math.min(parsed, MAX_MESSAGE_PAGE_LIMIT);
};

export const listMessagesController: RequestHandler = async (request, response, next) => {
	try {
		const chatId = request.params.chatId;

		if (!chatId) {
			response.status(400).json({ message: 'chatId is required' });
			return;
		}

		const page = await messageService.listMessagesByChat(chatId, {
			cursor: parseCursor(request.query.cursor),
			limit: parseLimit(request.query.limit),
		});

		response.status(200).json(page);
	} catch (error) {
		next(error);
	}
};
