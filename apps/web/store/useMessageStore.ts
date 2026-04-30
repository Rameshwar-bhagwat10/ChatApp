import { create } from 'zustand';
import type { Message } from '@chat-app/types';
import { OPTIMISTIC_MESSAGE_ID_PREFIX } from '../lib/constants';

interface MessageHydrationPayload {
	messagesByChat: Record<string, Message[]>;
	typingByChat: Record<string, string[]>;
}

interface MessageStore {
	messagesByChat: Record<string, Message[]>;
	typingByChat: Record<string, string[]>;
	isLoading: boolean;
	isHydrated: boolean;
	setLoading: (isLoading: boolean) => void;
	hydrateMessages: (payload: MessageHydrationPayload) => void;
	setMessagesForChat: (chatId: string, messages: Message[]) => void;
	prependMessages: (chatId: string, messages: Message[]) => void;
	addMessage: (message: Message) => void;
	removeMessage: (chatId: string, messageId: string) => void;
	setTypingUsers: (chatId: string, userIds: string[]) => void;
}

const optimisticMessageMatchWindowMs = 60_000;

const toTimestamp = (dateValue: string) => new Date(dateValue).getTime();

const sortByCreatedAt = (messages: Message[]) =>
	[...messages].sort((left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt));

const mergeMessageLists = (...messageLists: Message[][]) => {
	const messageById = new Map<string, Message>();

	for (const messages of messageLists) {
		for (const message of messages) {
			messageById.set(message.id, message);
		}
	}

	return sortByCreatedAt(Array.from(messageById.values()));
};

export const useMessageStore = create<MessageStore>((set) => ({
	messagesByChat: {},
	typingByChat: {},
	isLoading: false,
	isHydrated: false,
	setLoading: (isLoading) => set({ isLoading }),
	hydrateMessages: ({ messagesByChat, typingByChat }) =>
		set({
			messagesByChat,
			typingByChat,
			isHydrated: true,
			isLoading: false,
		}),
	setMessagesForChat: (chatId, messages) =>
		set((state) => ({
			messagesByChat: {
				...state.messagesByChat,
				[chatId]: sortByCreatedAt(messages),
			},
			isHydrated: true,
			isLoading: false,
		})),
	prependMessages: (chatId, messages) =>
		set((state) => {
			const existingMessages = state.messagesByChat[chatId] ?? [];

			return {
				messagesByChat: {
					...state.messagesByChat,
					[chatId]: mergeMessageLists(messages, existingMessages),
				},
			};
		}),
	addMessage: (message) =>
		set((state) => {
			const existingMessages = state.messagesByChat[message.chatId] ?? [];
			const messageIndex = existingMessages.findIndex((existingMessage) => existingMessage.id === message.id);

			if (messageIndex >= 0) {
				const nextMessages = [...existingMessages];
				nextMessages[messageIndex] = message;

				return {
					messagesByChat: {
						...state.messagesByChat,
						[message.chatId]: sortByCreatedAt(nextMessages),
					},
				};
			}

			const incomingTimestamp = toTimestamp(message.createdAt);
			const optimisticMessageIndex = existingMessages.findIndex((existingMessage) => {
				if (!existingMessage.id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX)) {
					return false;
				}

				if (existingMessage.senderId !== message.senderId || existingMessage.content !== message.content) {
					return false;
				}

				const optimisticTimestamp = toTimestamp(existingMessage.createdAt);
				return Number.isFinite(incomingTimestamp)
					&& Number.isFinite(optimisticTimestamp)
					&& Math.abs(incomingTimestamp - optimisticTimestamp) <= optimisticMessageMatchWindowMs;
			});

			if (optimisticMessageIndex >= 0) {
				const nextMessages = [...existingMessages];
				nextMessages[optimisticMessageIndex] = message;

				return {
					messagesByChat: {
						...state.messagesByChat,
						[message.chatId]: sortByCreatedAt(nextMessages),
					},
				};
			}

			return {
				messagesByChat: {
					...state.messagesByChat,
					[message.chatId]: mergeMessageLists(existingMessages, [message]),
				},
			};
		}),
	removeMessage: (chatId, messageId) =>
		set((state) => ({
			messagesByChat: {
				...state.messagesByChat,
				[chatId]: (state.messagesByChat[chatId] ?? []).filter((message) => message.id !== messageId),
			},
		})),
	setTypingUsers: (chatId, userIds) =>
		set((state) => ({
			typingByChat: {
				...state.typingByChat,
				[chatId]: userIds,
			},
		})),
}));
