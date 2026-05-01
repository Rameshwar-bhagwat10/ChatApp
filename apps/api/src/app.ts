import cors from 'cors';
import express from 'express';
import { apiConfig } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';
import { authRoutes } from './modules/auth/auth.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { messageRoutes } from './modules/message/message.routes';
import { userRoutes } from './modules/user/user.routes';

export const app = express();

app.set('trust proxy', apiConfig.trustProxy);
app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
	response.status(200).send('API is running');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/media', mediaRoutes);

app.use((_request, response) => {
	response.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);
