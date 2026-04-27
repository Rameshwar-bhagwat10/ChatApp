import type { Socket } from 'socket.io';
import { logger } from '@chat-app/utils';
import { PRESENCE_EVENTS } from '../events/presence.events';
import { registerMessageHandlers } from './message.handler';
import { registerTypingHandlers } from './typing.handler';

export const handleSocketConnection = (socket: Socket): void => {
	logger.info('User connected', { socketId: socket.id });

	registerMessageHandlers(socket);
	registerTypingHandlers(socket);

	socket.on(PRESENCE_EVENTS.disconnect, (reason: string) => {
		logger.info('User disconnected', {
			socketId: socket.id,
			reason,
		});
	});
};
