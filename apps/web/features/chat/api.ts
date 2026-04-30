import type { Chat } from '@chat-app/types';
import { apiClient } from '../../services/api';
import { MOCK_CHATS, MOCK_UNREAD_BY_CHAT, USE_MOCKS } from '../../lib/constants';

export interface ChatCollectionResponse {
	chats: Chat[];
	unreadByChat: Record<string, number>;
}

const buildEmptyUnreadByChat = (chats: Chat[]) =>
	Object.fromEntries(chats.map((chat) => [chat.id, 0] as const));

export const getChats = async (): Promise<Chat[]> => {
	if (USE_MOCKS) {
		return Promise.resolve(MOCK_CHATS);
	}

	const response = await apiClient.get<Chat[]>('/chats');
	return response.data;
};

export const getChatCollection = async (): Promise<ChatCollectionResponse> => {
	if (USE_MOCKS) {
		return Promise.resolve({
			chats: MOCK_CHATS,
			unreadByChat: MOCK_UNREAD_BY_CHAT,
		});
	}

	const chats = await getChats();

	return {
		chats,
		unreadByChat: buildEmptyUnreadByChat(chats),
	};
};
