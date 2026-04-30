import type { Message } from '@chat-app/types';

export interface ListMessagesByChatParams {
	cursor: string | null;
	limit: number;
}

export interface MessagePageResult {
	messages: Message[];
	nextCursor: string | null;
	hasMore: boolean;
}

const MESSAGE_HISTORY_SIZE = 240;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;
const SENDER_IDS = ['phase-1-user', 'phase-2-user', 'phase-3-user'] as const;

const messageHistoryByChat = new Map<string, Message[]>();

const nowTimestamp = Date.now();

const createMessageHistory = (chatId: string): Message[] =>
	Array.from({ length: MESSAGE_HISTORY_SIZE }, (_, index) => {
		const messageIndex = index + 1;
		const createdAt = new Date(nowTimestamp - (MESSAGE_HISTORY_SIZE - messageIndex) * 60_000).toISOString();
		const senderId = SENDER_IDS[index % SENDER_IDS.length] ?? SENDER_IDS[0];

		return {
			id: `${chatId}-message-${messageIndex}`,
			chatId,
			senderId,
			content: `Seed message ${messageIndex} for ${chatId}`,
			type: 'text',
			status: messageIndex % 3 === 0 ? 'seen' : messageIndex % 2 === 0 ? 'delivered' : 'sent',
			createdAt,
			updatedAt: createdAt,
		};
	});

const getMessageHistory = (chatId: string): Message[] => {
	const existingHistory = messageHistoryByChat.get(chatId);

	if (existingHistory) {
		return existingHistory;
	}

	const seededHistory = createMessageHistory(chatId);
	messageHistoryByChat.set(chatId, seededHistory);
	return seededHistory;
};

const toPositiveInt = (value: string | null, fallback: number): number => {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
};

const resolvePagination = (cursor: string | null, limit: number, totalCount: number) => {
	const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
	const parsedCursor = toPositiveInt(cursor, totalCount);
	const endIndex = Math.min(parsedCursor, totalCount);
	const startIndex = Math.max(0, endIndex - safeLimit);

	return {
		startIndex,
		endIndex,
		nextCursor: startIndex > 0 ? String(startIndex) : null,
		hasMore: startIndex > 0,
	};
};

export const messageService = {
	listMessagesByChat: async (
		chatId: string,
		{ cursor, limit = DEFAULT_LIMIT }: ListMessagesByChatParams,
	): Promise<MessagePageResult> => {
		const messageHistory = getMessageHistory(chatId);
		const page = resolvePagination(cursor, limit, messageHistory.length);

		return {
			messages: messageHistory.slice(page.startIndex, page.endIndex),
			nextCursor: page.nextCursor,
			hasMore: page.hasMore,
		};
	},
};
