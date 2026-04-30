import type { Socket } from 'socket.io';
import { logger } from '@chat-app/utils';
import { PRESENCE_EVENTS } from '../events/presence.events';
import { TYPING_EVENTS } from '../events/typing.events';

interface TypingEventPayload {
	chatId: string;
	userId: string;
}

interface TypingEventCandidate {
	chatId?: unknown;
	userId?: unknown;
}

const typingUserIdsByChat = new Map<string, Set<string>>();
const userIdBySocketId = new Map<string, string>();

const resolveTypingPayload = (payload: unknown, fallbackUserId: string): TypingEventPayload | null => {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const candidate = payload as TypingEventCandidate;

	if (typeof candidate.chatId !== 'string' || candidate.chatId.trim().length === 0) {
		return null;
	}

	const resolvedUserId =
		typeof candidate.userId === 'string' && candidate.userId.trim().length > 0 ? candidate.userId : fallbackUserId;

	return {
		chatId: candidate.chatId,
		userId: resolvedUserId,
	};
};

const emitTypingUpdated = (socket: Socket, chatId: string) => {
	const typingUserIds = Array.from(typingUserIdsByChat.get(chatId) ?? []);

	const typingPayload = {
		chatId,
		userIds: typingUserIds,
	};

	socket.emit(TYPING_EVENTS.typingUpdated, typingPayload);
	socket.broadcast.emit(TYPING_EVENTS.typingUpdated, typingPayload);
};

const addTypingUser = (chatId: string, userId: string) => {
	const typingUserIds = typingUserIdsByChat.get(chatId) ?? new Set<string>();
	typingUserIds.add(userId);
	typingUserIdsByChat.set(chatId, typingUserIds);
};

const removeTypingUser = (chatId: string, userId: string): boolean => {
	const typingUserIds = typingUserIdsByChat.get(chatId);

	if (!typingUserIds) {
		return false;
	}

	const existed = typingUserIds.delete(userId);

	if (typingUserIds.size === 0) {
		typingUserIdsByChat.delete(chatId);
	}

	return existed;
};

export const registerTypingHandlers = (socket: Socket): void => {
	const handleTypingStart = (payload: unknown) => {
		const typingPayload = resolveTypingPayload(payload, socket.id);

		if (!typingPayload) {
			logger.warn('Rejected invalid typing start payload', { socketId: socket.id });
			return;
		}

		userIdBySocketId.set(socket.id, typingPayload.userId);
		addTypingUser(typingPayload.chatId, typingPayload.userId);
		emitTypingUpdated(socket, typingPayload.chatId);

		socket.broadcast.emit(TYPING_EVENTS.legacyUserTyping, {
			userId: typingPayload.userId,
			isTyping: true,
		});
	};

	const handleTypingStop = (payload: unknown) => {
		const typingPayload = resolveTypingPayload(payload, userIdBySocketId.get(socket.id) ?? socket.id);

		if (!typingPayload) {
			logger.warn('Rejected invalid typing stop payload', { socketId: socket.id });
			return;
		}

		userIdBySocketId.set(socket.id, typingPayload.userId);
		removeTypingUser(typingPayload.chatId, typingPayload.userId);
		emitTypingUpdated(socket, typingPayload.chatId);

		socket.broadcast.emit(TYPING_EVENTS.legacyUserTyping, {
			userId: typingPayload.userId,
			isTyping: false,
		});
	};

	socket.on(TYPING_EVENTS.typingStart, handleTypingStart);
	socket.on(TYPING_EVENTS.typingStop, handleTypingStop);
	socket.on(TYPING_EVENTS.legacyTypingStart, handleTypingStart);
	socket.on(TYPING_EVENTS.legacyTypingStop, handleTypingStop);

	socket.on(PRESENCE_EVENTS.disconnect, () => {
		const disconnectedUserId = userIdBySocketId.get(socket.id) ?? socket.id;
		userIdBySocketId.delete(socket.id);

		for (const chatId of Array.from(typingUserIdsByChat.keys())) {
			if (!removeTypingUser(chatId, disconnectedUserId)) {
				continue;
			}

			emitTypingUpdated(socket, chatId);
		}
	});
};
