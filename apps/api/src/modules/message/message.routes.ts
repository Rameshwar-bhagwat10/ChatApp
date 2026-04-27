import { Router } from 'express';
import { listMessagesController } from './message.controller';

export const messageRoutes = Router();

messageRoutes.get('/:chatId', listMessagesController);
