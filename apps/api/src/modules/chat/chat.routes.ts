import { Router } from 'express';
import { createChatController, listChatsController } from './chat.controller';

export const chatRoutes = Router();

chatRoutes.get('/', listChatsController);
chatRoutes.post('/', createChatController);
