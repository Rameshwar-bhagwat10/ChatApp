import type { RequestHandler } from 'express';
import { chatService } from './chat.service';
import { parseChatIdPathParams, parseCreateChatPayload } from './chat.validation';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const getAuthenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
	const userId = request.authUser?.userId;

	if (!userId) {
		throw createError(401, 'Unauthorized');
	}

	return userId;
};

export const createChatController: RequestHandler = async (request, response, next) => {
	try {
		const requesterUserId = getAuthenticatedUserId(request);
		const payload = parseCreateChatPayload(request.body);
		const chat = await chatService.createChat({
			type: payload.type,
			userIds: payload.userIds,
			requesterUserId,
		});

		response.status(201).json({
			success: true,
			data: chat,
		});
	} catch (error) {
		next(error);
	}
};

export const getUserChatsController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getAuthenticatedUserId(request);
		const chats = await chatService.getUserChats(userId);

		response.status(200).json({
			success: true,
			data: chats,
		});
	} catch (error) {
		next(error);
	}
};

export const getChatByIdController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getAuthenticatedUserId(request);
		const { id } = parseChatIdPathParams(request.params);
		const chat = await chatService.getChatById({
			chatId: id,
			userId,
		});

		response.status(200).json({
			success: true,
			data: chat,
		});
	} catch (error) {
		next(error);
	}
};
