import type { Message } from '@chat-app/types';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../lib/constants';

export interface TypingUpdatedPayload {
	chatId: string;
	userIds: string[];
}

export interface PresenceUpdatedPayload {
	userId: string;
	isOnline: boolean;
}

export interface MessageSendPayload {
	chatId: string;
	content: string;
	type: 'text';
	senderId: string;
	clientMessageId: string;
}

export interface TypingEventPayload {
	chatId: string;
	userId: string;
}

export interface MessageDeliveryAck {
	accepted: boolean;
	clientMessageId: string;
	serverMessageId?: string;
	message?: Message;
	error?: string;
}

export interface ServerToClientEvents {
	connect: () => void;
	disconnect: (reason: string) => void;
	connect_error: (error: Error) => void;
	'message:created': (message: Message) => void;
	'typing:updated': (payload: TypingUpdatedPayload) => void;
	'presence:updated': (payload: PresenceUpdatedPayload) => void;
}

export interface ClientToServerEvents {
	'message:send': (payload: MessageSendPayload) => void;
	'typing:start': (payload: TypingEventPayload) => void;
	'typing:stop': (payload: TypingEventPayload) => void;
}

export interface ChatSocketClient {
	readonly connected: boolean;
	connect: () => void;
	disconnect: () => void;
	on: <TEvent extends keyof ServerToClientEvents>(
		event: TEvent,
		listener: ServerToClientEvents[TEvent],
	) => void;
	off: <TEvent extends keyof ServerToClientEvents>(
		event: TEvent,
		listener: ServerToClientEvents[TEvent],
	) => void;
	emit: <TEvent extends keyof ClientToServerEvents>(
		event: TEvent,
		payload: Parameters<ClientToServerEvents[TEvent]>[0],
	) => void;
	sendMessageWithAck: (payload: MessageSendPayload, timeoutMs: number) => Promise<MessageDeliveryAck>;
}

type RawSocketClient = Socket;
type RawConnectListener = () => void;
type RawDisconnectListener = (reason: string) => void;
type RawConnectErrorListener = (error: Error) => void;
type RawMessageListener = (payload: unknown) => void;
type RawTypingListener = (payload: unknown) => void;
type RawPresenceListener = (payload: unknown) => void;

const isMessage = (value: unknown): value is Message => {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.id === 'string'
		&& typeof candidate.chatId === 'string'
		&& typeof candidate.senderId === 'string'
		&& typeof candidate.content === 'string'
		&& (candidate.type === 'text' || candidate.type === 'image' || candidate.type === 'file')
		&& (candidate.status === 'sent' || candidate.status === 'delivered' || candidate.status === 'seen')
		&& typeof candidate.createdAt === 'string'
		&& typeof candidate.updatedAt === 'string'
	);
};

const isTypingUpdatedPayload = (value: unknown): value is TypingUpdatedPayload => {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.chatId === 'string'
		&& Array.isArray(candidate.userIds)
		&& candidate.userIds.every((userId) => typeof userId === 'string')
	);
};

const isPresenceUpdatedPayload = (value: unknown): value is PresenceUpdatedPayload => {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	return typeof candidate.userId === 'string' && typeof candidate.isOnline === 'boolean';
};

const normalizeAckMessage = (payload: MessageSendPayload, messageId: string): Message => {
	const timestamp = new Date().toISOString();

	return {
		id: messageId,
		chatId: payload.chatId,
		senderId: payload.senderId,
		content: payload.content,
		type: payload.type,
		status: 'sent',
		createdAt: timestamp,
		updatedAt: timestamp,
	};
};

const normalizeMessageDeliveryAck = (
	value: unknown,
	payload: MessageSendPayload,
): MessageDeliveryAck => {
	if (isMessage(value)) {
		return {
			accepted: true,
			clientMessageId: payload.clientMessageId,
			serverMessageId: value.id,
			message: value,
		};
	}

	if (!value || typeof value !== 'object') {
		return {
			accepted: true,
			clientMessageId: payload.clientMessageId,
		};
	}

	const candidate = value as Record<string, unknown>;
	const accepted = typeof candidate.accepted === 'boolean' ? candidate.accepted : true;
	const error = typeof candidate.error === 'string' ? candidate.error : undefined;
	const clientMessageId =
		typeof candidate.clientMessageId === 'string' ? candidate.clientMessageId : payload.clientMessageId;
	const serverMessageId =
		typeof candidate.serverMessageId === 'string'
			? candidate.serverMessageId
			: (typeof candidate.messageId === 'string' ? candidate.messageId : undefined);
	const ackMessage = isMessage(candidate.message) ? candidate.message : undefined;
	const message = ackMessage ?? (serverMessageId ? normalizeAckMessage(payload, serverMessageId) : undefined);

	return {
		accepted,
		error,
		clientMessageId,
		serverMessageId,
		message,
	};
};

const createSocketClient = (): ChatSocketClient => {
	const rawClient: RawSocketClient = io(SOCKET_BASE_URL, {
		autoConnect: false,
		transports: ['websocket'],
		reconnectionAttempts: 3,
	});

	const messageCreatedListenerMap = new Map<ServerToClientEvents['message:created'], RawMessageListener>();
	const typingUpdatedListenerMap = new Map<ServerToClientEvents['typing:updated'], RawTypingListener>();
	const presenceUpdatedListenerMap = new Map<ServerToClientEvents['presence:updated'], RawPresenceListener>();

	const onMessageCreated = (listener: ServerToClientEvents['message:created']) => {
		const wrappedListener: RawMessageListener = (payload) => {
			if (!isMessage(payload)) {
				return;
			}

			listener(payload);
		};

		messageCreatedListenerMap.set(listener, wrappedListener);
		rawClient.on('message:created', wrappedListener);
	};

	const onTypingUpdated = (listener: ServerToClientEvents['typing:updated']) => {
		const wrappedListener: RawTypingListener = (payload) => {
			if (!isTypingUpdatedPayload(payload)) {
				return;
			}

			listener(payload);
		};

		typingUpdatedListenerMap.set(listener, wrappedListener);
		rawClient.on('typing:updated', wrappedListener);
	};

	const onPresenceUpdated = (listener: ServerToClientEvents['presence:updated']) => {
		const wrappedListener: RawPresenceListener = (payload) => {
			if (!isPresenceUpdatedPayload(payload)) {
				return;
			}

			listener(payload);
		};

		presenceUpdatedListenerMap.set(listener, wrappedListener);
		rawClient.on('presence:updated', wrappedListener);
	};

	const offMessageCreated = (listener: ServerToClientEvents['message:created']) => {
		const wrappedListener = messageCreatedListenerMap.get(listener);

		if (!wrappedListener) {
			return;
		}

		rawClient.off('message:created', wrappedListener);
		messageCreatedListenerMap.delete(listener);
	};

	const offTypingUpdated = (listener: ServerToClientEvents['typing:updated']) => {
		const wrappedListener = typingUpdatedListenerMap.get(listener);

		if (!wrappedListener) {
			return;
		}

		rawClient.off('typing:updated', wrappedListener);
		typingUpdatedListenerMap.delete(listener);
	};

	const offPresenceUpdated = (listener: ServerToClientEvents['presence:updated']) => {
		const wrappedListener = presenceUpdatedListenerMap.get(listener);

		if (!wrappedListener) {
			return;
		}

		rawClient.off('presence:updated', wrappedListener);
		presenceUpdatedListenerMap.delete(listener);
	};

	const on: ChatSocketClient['on'] = (event, listener) => {
		if (event === 'connect') {
			rawClient.on('connect', listener as RawConnectListener);
			return;
		}

		if (event === 'disconnect') {
			rawClient.on('disconnect', listener as RawDisconnectListener);
			return;
		}

		if (event === 'connect_error') {
			rawClient.on('connect_error', listener as RawConnectErrorListener);
			return;
		}

		if (event === 'message:created') {
			onMessageCreated(listener as ServerToClientEvents['message:created']);
			return;
		}

		if (event === 'typing:updated') {
			onTypingUpdated(listener as ServerToClientEvents['typing:updated']);
			return;
		}

		onPresenceUpdated(listener as ServerToClientEvents['presence:updated']);
	};

	const off: ChatSocketClient['off'] = (event, listener) => {
		if (event === 'connect') {
			rawClient.off('connect', listener as RawConnectListener);
			return;
		}

		if (event === 'disconnect') {
			rawClient.off('disconnect', listener as RawDisconnectListener);
			return;
		}

		if (event === 'connect_error') {
			rawClient.off('connect_error', listener as RawConnectErrorListener);
			return;
		}

		if (event === 'message:created') {
			offMessageCreated(listener as ServerToClientEvents['message:created']);
			return;
		}

		if (event === 'typing:updated') {
			offTypingUpdated(listener as ServerToClientEvents['typing:updated']);
			return;
		}

		offPresenceUpdated(listener as ServerToClientEvents['presence:updated']);
	};

	const emit: ChatSocketClient['emit'] = (event, payload) => {
		rawClient.emit(event, payload);
	};

	const sendMessageWithAck: ChatSocketClient['sendMessageWithAck'] = (payload, timeoutMs) =>
		new Promise((resolve, reject) => {
			rawClient.timeout(timeoutMs).emit('message:send', payload, (error: Error | null, ackPayload?: unknown) => {
				if (error) {
					reject(new Error('Message delivery acknowledgement timed out'));
					return;
				}

				const ack = normalizeMessageDeliveryAck(ackPayload, payload);

				if (!ack.accepted) {
					reject(new Error(ack.error ?? 'Message delivery rejected by server'));
					return;
				}

				resolve(ack);
			});
		});

	return {
		get connected() {
			return rawClient.connected;
		},
		connect: () => {
			rawClient.connect();
		},
		disconnect: () => {
			rawClient.disconnect();
		},
		on,
		off,
		emit,
		sendMessageWithAck,
	};
};

let socketClient: ChatSocketClient | null = null;
let activeConsumers = 0;

export const getSocketClient = (): ChatSocketClient => {
	if (!socketClient) {
		socketClient = createSocketClient();
	}

	return socketClient;
};

export const acquireSocketClient = (): ChatSocketClient => {
	const client = getSocketClient();

	activeConsumers += 1;

	if (!client.connected) {
		client.connect();
	}

	return client;
};

export const releaseSocketClient = () => {
	activeConsumers = Math.max(0, activeConsumers - 1);

	if (activeConsumers === 0 && socketClient?.connected) {
		socketClient.disconnect();
	}
};
