import type { Socket } from 'socket.io';
import type { Message } from '@chat-app/types';
import { logger } from '@chat-app/utils';
import { MESSAGE_EVENTS } from '../events/message.events';

interface SendMessagePayload {
	chatId: string;
	content: string;
	type: 'text' | 'image' | 'file';
	senderId: string;
	clientMessageId: string;
}

interface MessageDeliveryAck {
	accepted: boolean;
	clientMessageId: string;
	messageId?: string;
	message?: Message;
	error?: string;
}

type MessageAckCallback = (ack: MessageDeliveryAck) => void;

const createMessageId = () => `message-${Date.now()}-${Math.round(Math.random() * 100_000)}`;

const nowIso = () => new Date().toISOString();

const toServerMessage = (payload: SendMessagePayload): Message => {
	const timestamp = nowIso();

	return {
		id: createMessageId(),
		chatId: payload.chatId,
		senderId: payload.senderId,
		content: payload.content,
		type: payload.type,
		status: 'sent',
		createdAt: timestamp,
		updatedAt: timestamp,
	};
};

const resolveClientMessageId = (payload: unknown): string => {
	if (!payload || typeof payload !== 'object') {
		return '';
	}

	const candidate = payload as Record<string, unknown>;
	return typeof candidate.clientMessageId === 'string' ? candidate.clientMessageId : '';
};

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
		(candidate.type === 'text' || candidate.type === 'image' || candidate.type === 'file') &&
		typeof candidate.senderId === 'string' &&
		candidate.senderId.trim().length > 0 &&
		typeof candidate.clientMessageId === 'string' &&
		candidate.clientMessageId.trim().length > 0
	);
};

export const registerMessageHandlers = (socket: Socket): void => {
	const handleMessageSend = (payload: unknown, acknowledge?: MessageAckCallback) => {
		const clientMessageId = resolveClientMessageId(payload);

		if (!isValidSendMessagePayload(payload)) {
			logger.warn('Rejected invalid message payload', { socketId: socket.id });
			acknowledge?.({
				accepted: false,
				clientMessageId,
				error: 'Invalid message payload',
			});
			return;
		}

		const serverMessage = toServerMessage(payload);

		logger.info('Accepted message event', {
			socketId: socket.id,
			chatId: payload.chatId,
			clientMessageId: payload.clientMessageId,
		});

		socket.emit(MESSAGE_EVENTS.receiveMessage, serverMessage);
		socket.broadcast.emit(MESSAGE_EVENTS.receiveMessage, serverMessage);
		socket.emit(MESSAGE_EVENTS.legacyReceiveMessage, serverMessage);
		socket.broadcast.emit(MESSAGE_EVENTS.legacyReceiveMessage, serverMessage);

		acknowledge?.({
			accepted: true,
			clientMessageId: payload.clientMessageId,
			messageId: serverMessage.id,
			message: serverMessage,
		});
	};

	socket.on(MESSAGE_EVENTS.sendMessage, handleMessageSend);
	socket.on(MESSAGE_EVENTS.legacySendMessage, handleMessageSend);
};
