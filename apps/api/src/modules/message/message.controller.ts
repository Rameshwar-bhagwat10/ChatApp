import type { RequestHandler } from 'express';
import { messageService } from './message.service';

export const listMessagesController: RequestHandler = async (request, response, next) => {
	try {
		const chatId = request.params.chatId;

		if (!chatId) {
			response.status(400).json({ message: 'chatId is required' });
			return;
		}

		const messages = await messageService.listMessagesByChat(chatId);
		response.status(200).json(messages);
	} catch (error) {
		next(error);
	}
};
