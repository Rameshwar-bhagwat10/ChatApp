import type { RequestHandler } from 'express';
import { chatService } from './chat.service';

export const listChatsController: RequestHandler = async (_request, response, next) => {
	try {
		const chats = await chatService.listChats();

		response.status(200).json(chats);
	} catch (error) {
		next(error);
	}
};

export const createChatController: RequestHandler = async (_request, response, next) => {
	try {
		const chat = await chatService.createChat();

		response.status(201).json(chat);
	} catch (error) {
		next(error);
	}
};
