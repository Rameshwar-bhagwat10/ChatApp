import type { RequestHandler } from 'express';
import { chatService, type AddUserToChatInput, type CreateChatInput } from './chat.service';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const parseChatType = (value: unknown): CreateChatInput['type'] => {
	if (typeof value === 'string') {
		const normalized = value.trim().toUpperCase();
		if (normalized === 'PRIVATE' || normalized === 'GROUP') {
			return normalized;
		}
	}

	return 'GROUP';
};

const parseRole = (value: unknown): AddUserToChatInput['role'] => {
	if (typeof value === 'string') {
		const normalized = value.trim().toUpperCase();
		if (normalized === 'ADMIN' || normalized === 'MEMBER') {
			return normalized;
		}
	}

	return 'MEMBER';
};

const parseMemberIds = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((entry): entry is string => typeof entry === 'string');
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

export const listChatsController: RequestHandler = async (request, response, next) => {
	try {
		const authenticatedUser = request.authUser;

		if (!authenticatedUser) {
			throw createError(401, 'Unauthorized');
		}

		const chats = await chatService.getUserChats({
			userId: authenticatedUser.userId,
			cursor: parseCursor(request.query.cursor),
			limit: parseLimit(request.query.limit),
		});

		response.status(200).json(chats);
	} catch (error) {
		next(error);
	}
};

export const createChatController: RequestHandler = async (request, response, next) => {
	try {
		const authenticatedUser = request.authUser;

		if (!authenticatedUser) {
			throw createError(401, 'Unauthorized');
		}

		const body = request.body as { type?: unknown; memberIds?: unknown };
		const requestedType = parseChatType(body.type);
		const requestedMemberIds = parseMemberIds(body.memberIds);
		const memberIds = Array.from(new Set([authenticatedUser.userId, ...requestedMemberIds]));

		const chat = await chatService.createChat({
			type: requestedType,
			memberIds,
		});

		response.status(201).json(chat);
	} catch (error) {
		next(error);
	}
};

export const addUserToChatController: RequestHandler = async (request, response, next) => {
	try {
		const authenticatedUser = request.authUser;

		if (!authenticatedUser) {
			throw createError(401, 'Unauthorized');
		}

		const chatId = request.params.chatId;

		if (!chatId) {
			throw createError(400, 'chatId is required');
		}

		const body = request.body as { userId?: unknown; role?: unknown };

		if (typeof body.userId !== 'string') {
			throw createError(400, 'userId is required');
		}

		const chatMember = await chatService.addUserToChat({
			chatId,
			userId: body.userId,
			role: parseRole(body.role),
		});

		response.status(201).json(chatMember);
	} catch (error) {
		next(error);
	}
};
