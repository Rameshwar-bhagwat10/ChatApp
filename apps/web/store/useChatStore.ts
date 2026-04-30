import { create } from 'zustand';
import type { Chat } from '@chat-app/types';

interface ChatHydrationPayload {
	chats: Chat[];
	unreadByChat: Record<string, number>;
	activeChatId: string | null;
}

interface ChatStore {
	chats: Chat[];
	unreadByChat: Record<string, number>;
	activeChatId: string | null;
	searchQuery: string;
	isLoading: boolean;
	isHydrated: boolean;
	setLoading: (isLoading: boolean) => void;
	hydrateChats: (payload: ChatHydrationPayload) => void;
	setActiveChat: (chatId: string) => void;
	setSearchQuery: (searchQuery: string) => void;
	markChatRead: (chatId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
	chats: [],
	unreadByChat: {},
	activeChatId: null,
	searchQuery: '',
	isLoading: false,
	isHydrated: false,
	setLoading: (isLoading) => set({ isLoading }),
	hydrateChats: ({ chats, unreadByChat, activeChatId }) =>
		set({
			chats,
			unreadByChat,
			activeChatId,
			isHydrated: true,
			isLoading: false,
		}),
	setActiveChat: (chatId) =>
		set((state) => ({
			activeChatId: chatId,
			unreadByChat: {
				...state.unreadByChat,
				[chatId]: 0,
			},
		})),
	setSearchQuery: (searchQuery) => set({ searchQuery }),
	markChatRead: (chatId) =>
		set((state) => ({
			unreadByChat: {
				...state.unreadByChat,
				[chatId]: 0,
			},
		})),
}));
