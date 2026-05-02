import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createChatController, getChatByIdController, getUserChatsController } from './chat.controller';

export const chatRoutes = Router();

chatRoutes.post('/', authMiddleware, createChatController);
chatRoutes.get('/', authMiddleware, getUserChatsController);
chatRoutes.get('/:id', authMiddleware, getChatByIdController);
