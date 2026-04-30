import type { Message } from '@chat-app/types';
import axios from 'axios';
import { apiClient } from '../../services/api';
import {
	MESSAGE_WINDOW_SIZE,
	MOCK_MESSAGES_BY_CHAT,
	MOCK_TYPING_BY_CHAT,
	OPTIMISTIC_MESSAGE_ID_PREFIX,
	USE_MOCKS,
} from '../../lib/constants';
import type { GetMessagePageParams, MessagePageResponse, SendMessagePayload } from './types';

interface MessagePagePayload {
	messages?: unknown;
	items?: unknown;
	nextCursor?: unknown;
	hasMore?: unknown;
}

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

const isNotFoundError = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 404;

const paginateMessages = (
	messages: Message[],
	cursor: string | null,
	limit: number,
): Pick<MessagePageResponse, 'messages' | 'nextCursor' | 'hasMore'> => {
	const safeLimit = Math.max(1, limit);
	const parsedCursor = cursor ? Number.parseInt(cursor, 10) : Number.NaN;
	const endIndex =
		Number.isInteger(parsedCursor) && parsedCursor > 0
			? Math.min(parsedCursor, messages.length)
			: messages.length;
	const startIndex = Math.max(0, endIndex - safeLimit);

	return {
		messages: messages.slice(startIndex, endIndex),
		nextCursor: startIndex > 0 ? String(startIndex) : null,
		hasMore: startIndex > 0,
	};
};

const parseMessageList = (value: unknown): Message[] =>
	Array.isArray(value) ? value.filter((message): message is Message => isMessage(message)) : [];

const normalizeMessagePagePayload = (
	payload: unknown,
	cursor: string | null,
	limit: number,
): Pick<MessagePageResponse, 'messages' | 'nextCursor' | 'hasMore'> => {
	if (Array.isArray(payload)) {
		return paginateMessages(parseMessageList(payload), cursor, limit);
	}

	if (!payload || typeof payload !== 'object') {
		return {
			messages: [],
			nextCursor: null,
			hasMore: false,
		};
	}

	const candidate = payload as MessagePagePayload;
	const pageMessages = parseMessageList(candidate.messages ?? candidate.items);
	const nextCursor = typeof candidate.nextCursor === 'string' ? candidate.nextCursor : null;
	const canLoadMoreFromCursor = nextCursor !== null && nextCursor.length > 0;
	const hasMore =
		typeof candidate.hasMore === 'boolean'
			? candidate.hasMore && canLoadMoreFromCursor
			: canLoadMoreFromCursor;

	return {
		messages: pageMessages,
		nextCursor: canLoadMoreFromCursor ? nextCursor : null,
		hasMore,
	};
};

const requestMessagePage = async (
	chatId: string,
	cursor: string | null,
	limit: number,
): Promise<unknown> => {
	try {
		const response = await apiClient.get(`/api/v1/messages/${chatId}`, {
			params: {
				cursor: cursor ?? undefined,
				limit,
			},
		});

		return response.data;
	} catch (error) {
		if (!isNotFoundError(error)) {
			throw error;
		}
	}

	const fallbackResponse = await apiClient.get('/messages', {
		params: {
			chatId,
			cursor: cursor ?? undefined,
			limit,
		},
	});

	return fallbackResponse.data;
};

export const getMessagePageByChat = async ({
	chatId,
	cursor = null,
	limit = MESSAGE_WINDOW_SIZE,
}: GetMessagePageParams): Promise<MessagePageResponse> => {
	if (USE_MOCKS) {
		const mockMessages = MOCK_MESSAGES_BY_CHAT[chatId] ?? [];
		const pagedResult = paginateMessages(mockMessages, cursor, limit);

		return {
			...pagedResult,
			typingUserIds: cursor ? [] : (MOCK_TYPING_BY_CHAT[chatId] ?? []),
		};
	}

	const payload = await requestMessagePage(chatId, cursor, limit);
	const normalizedResult = normalizeMessagePagePayload(payload, cursor, limit);

	return {
		...normalizedResult,
		typingUserIds: [],
	};
};

export const createOptimisticMessage = ({ chatId, senderId, content }: SendMessagePayload): Message => {
	const createdAt = new Date().toISOString();

	return {
		id: `${OPTIMISTIC_MESSAGE_ID_PREFIX}${Date.now()}-${Math.round(Math.random() * 100_000)}`,
		chatId,
		senderId,
		content,
		type: 'text',
		status: 'sent',
		createdAt,
		updatedAt: createdAt,
	};
};
