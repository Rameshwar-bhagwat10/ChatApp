import type { RequestHandler } from 'express';
import { messageService } from './message.service';
import {
	parseCreateMessagePayload,
	parseMessageChatPathParams,
	parseMessagePaginationQuery,
} from './message.validation';

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

export const createMessageController: RequestHandler = async (request, response, next) => {
	try {
		const senderId = getAuthenticatedUserId(request);
		const payload = parseCreateMessagePayload(request.body);
		const message = await messageService.createMessage({
			chatId: payload.chatId,
			senderId,
			content: payload.content,
			type: payload.type,
		});

		response.status(201).json({
			success: true,
			data: message,
		});
	} catch (error) {
		next(error);
	}
};

export const getMessagesByChatController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getAuthenticatedUserId(request);
		const { chatId } = parseMessageChatPathParams(request.params);
		const { page, limit } = parseMessagePaginationQuery(request.query);
		const result = await messageService.getMessagesByChat({
			chatId,
			userId,
			page,
			limit,
		});

		response.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
