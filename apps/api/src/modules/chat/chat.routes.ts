import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { addUserToChatController, createChatController, listChatsController } from './chat.controller';

export const chatRoutes = Router();

chatRoutes.get('/', authMiddleware, listChatsController);
chatRoutes.post('/', authMiddleware, createChatController);
chatRoutes.post('/:chatId/members', authMiddleware, addUserToChatController);
