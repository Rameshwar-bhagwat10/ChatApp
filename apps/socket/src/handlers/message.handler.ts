import type { Socket } from 'socket.io';
import { logger } from '@chat-app/utils';
import { MESSAGE_EVENTS } from '../events/message.events';

interface SendMessagePayload {
	chatId: string;
	content: string;
	type: 'text' | 'image' | 'file';
}

const isValidSendMessagePayload = (payload: unknown): payload is SendMessagePayload => {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const candidate = payload as Record<string, unknown>;

	return (
		typeof candidate.chatId === 'string' &&
		candidate.chatId.trim().length > 0 &&
		typeof candidate.content === 'string' &&
		candidate.content.trim().length > 0 &&
		(candidate.type === 'text' || candidate.type === 'image' || candidate.type === 'file')
	);
};

export const registerMessageHandlers = (socket: Socket): void => {
	socket.on(MESSAGE_EVENTS.sendMessage, (payload: unknown) => {
		if (!isValidSendMessagePayload(payload)) {
			logger.warn('Rejected invalid message payload', { socketId: socket.id });
			return;
		}

		logger.info('Accepted message event', {
			socketId: socket.id,
			chatId: payload.chatId,
		});

		socket.emit(MESSAGE_EVENTS.receiveMessage, {
			...payload,
			senderId: socket.id,
		});
	});
};
