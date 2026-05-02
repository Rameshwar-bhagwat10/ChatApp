import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createMessageController, listMessagesController } from './message.controller';

export const messageRoutes = Router();

messageRoutes.get('/:chatId', listMessagesController);
messageRoutes.post('/:chatId', authMiddleware, createMessageController);
