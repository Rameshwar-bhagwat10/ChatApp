import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createMessageController, getMessagesByChatController } from './message.controller';

export const messageRoutes = Router();

messageRoutes.post('/', authMiddleware, createMessageController);
messageRoutes.get('/:chatId', authMiddleware, getMessagesByChatController);
