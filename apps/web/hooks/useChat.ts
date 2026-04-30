'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Chat, User } from '@chat-app/types';
import type { ChatSocketClient } from '../services/socket';
import type { PresenceUpdatedPayload } from '../services/socket';
import { useDebounce } from './useDebounce';
import { getChatCollection } from '../features/chat/api';
import { getUserDirectory } from '../features/user/api';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useMessageStore } from '../store/useMessageStore';
import { useUserStore } from '../store/useUserStore';
import type { ActiveChatViewModel, ChatListItemViewModel } from '../features/chat/types';

interface UseChatOptions {
	initialChatId?: string;
	socket: ChatSocketClient | null;
	isRealtimeEnabled: boolean;
}

const resolveDirectMember = (chat: Chat, currentUserId: string) =>
	chat.memberIds.find((memberId) => memberId !== currentUserId);

const resolveChatTitle = (chat: Chat, currentUserId: string, usersById: Map<string, User>) => {
	if (chat.type === 'group') {
		return chat.name ?? 'Group chat';
	}

	const directMemberId = resolveDirectMember(chat, currentUserId);
	return (directMemberId && usersById.get(directMemberId)?.username) ?? 'Unknown contact';
};

const resolveChatAvatar = (chat: Chat, currentUserId: string, usersById: Map<string, User>) => {
	if (chat.type === 'group') {
		return 'https://api.dicebear.com/9.x/thumbs/svg?seed=group-chat';
	}

	const directMemberId = resolveDirectMember(chat, currentUserId);
	return directMemberId ? usersById.get(directMemberId)?.avatarUrl : undefined;
};

const resolveChatOnlineStatus = (
	chat: Chat,
	currentUserId: string,
	onlineUserIds: ReadonlySet<string>,
) => {
	if (chat.type === 'group') {
		return false;
	}

	const directMemberId = resolveDirectMember(chat, currentUserId);
	return Boolean(directMemberId && onlineUserIds.has(directMemberId));
};

const emptyMessages: never[] = [];

export const useChat = ({ initialChatId, socket, isRealtimeEnabled }: UseChatOptions) => {
	const currentUserId = useAuthStore((state) => state.currentUserId);
	const toggleTheme = useAuthStore((state) => state.toggleTheme);
	const theme = useAuthStore((state) => state.theme);

	const chats = useChatStore((state) => state.chats);
	const unreadByChat = useChatStore((state) => state.unreadByChat);
	const activeChatId = useChatStore((state) => state.activeChatId);
	const searchQuery = useChatStore((state) => state.searchQuery);
	const isChatLoading = useChatStore((state) => state.isLoading);
	const isChatHydrated = useChatStore((state) => state.isHydrated);
	const setChatLoading = useChatStore((state) => state.setLoading);
	const hydrateChats = useChatStore((state) => state.hydrateChats);
	const setSearchQuery = useChatStore((state) => state.setSearchQuery);
	const setActiveChat = useChatStore((state) => state.setActiveChat);
	const markChatRead = useChatStore((state) => state.markChatRead);

	const users = useUserStore((state) => state.users);
	const onlineUserIds = useUserStore((state) => state.onlineUserIds);
	const isUserLoading = useUserStore((state) => state.isLoading);
	const isUserHydrated = useUserStore((state) => state.isHydrated);
	const setUserLoading = useUserStore((state) => state.setLoading);
	const hydrateUsers = useUserStore((state) => state.hydrateUsers);
	const updatePresence = useUserStore((state) => state.updatePresence);

	const messagesByChat = useMessageStore((state) => state.messagesByChat);

	const [loadError, setLoadError] = useState<string | null>(null);

	const usersById = useMemo(
		() => new Map<string, User>(users.map((user) => [user.id, user])),
		[users],
	);
	const onlineUserSet = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);

	const debouncedSearchQuery = useDebounce(searchQuery, 120);

	useEffect(() => {
		if (isChatHydrated && isUserHydrated) {
			return;
		}

		let isMounted = true;

		const loadChatState = async () => {
			setChatLoading(true);
			setUserLoading(true);
			setLoadError(null);

			try {
				const [chatCollection, userDirectory] = await Promise.all([getChatCollection(), getUserDirectory()]);

				if (!isMounted) {
					return;
				}

				const nextActiveChatId =
					initialChatId && chatCollection.chats.some((chat) => chat.id === initialChatId)
						? initialChatId
						: (chatCollection.chats[0]?.id ?? null);

				hydrateChats({
					chats: chatCollection.chats,
					unreadByChat: chatCollection.unreadByChat,
					activeChatId: nextActiveChatId,
				});
				hydrateUsers({
					users: userDirectory.users,
					onlineUserIds: userDirectory.onlineUserIds,
				});
			} catch (error) {
				if (isMounted) {
					setChatLoading(false);
					setUserLoading(false);
					setLoadError(error instanceof Error ? error.message : 'Failed to load chats');
				}
			}
		};

		void loadChatState();

		return () => {
			isMounted = false;
		};
	}, [
		hydrateChats,
		hydrateUsers,
		initialChatId,
		isChatHydrated,
		isUserHydrated,
		setChatLoading,
		setUserLoading,
	]);

	useEffect(() => {
		if (!initialChatId || chats.length === 0) {
			return;
		}

		const chatExists = chats.some((chat) => chat.id === initialChatId);

		if (chatExists) {
			setActiveChat(initialChatId);
		}
	}, [initialChatId, chats, setActiveChat]);

	useEffect(() => {
		if (!socket || !isRealtimeEnabled) {
			return;
		}

		const handlePresenceUpdated = (payload: PresenceUpdatedPayload) => {
			updatePresence(payload.userId, payload.isOnline);
		};

		socket.on('presence:updated', handlePresenceUpdated);

		return () => {
			socket.off('presence:updated', handlePresenceUpdated);
		};
	}, [isRealtimeEnabled, socket, updatePresence]);

	const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase();

	const chatItems = useMemo<ChatListItemViewModel[]>(() => {
		return chats
			.filter((chat) => {
				if (!normalizedSearchQuery) {
					return true;
				}

				return resolveChatTitle(chat, currentUserId, usersById)
					.toLowerCase()
					.includes(normalizedSearchQuery);
			})
			.map((chat) => {
				const messages = messagesByChat[chat.id] ?? emptyMessages;
				const lastMessage = messages[messages.length - 1];

				return {
					id: chat.id,
					title: resolveChatTitle(chat, currentUserId, usersById),
					avatarUrl: resolveChatAvatar(chat, currentUserId, usersById),
					lastMessage: lastMessage?.content ?? 'No messages yet',
					lastMessageAt: lastMessage?.createdAt ?? chat.updatedAt,
					unreadCount: unreadByChat[chat.id] ?? 0,
					isOnline: resolveChatOnlineStatus(chat, currentUserId, onlineUserSet),
				};
			});
	}, [chats, currentUserId, messagesByChat, normalizedSearchQuery, onlineUserSet, unreadByChat, usersById]);

	const activeChat = useMemo<ActiveChatViewModel | null>(() => {
		if (!activeChatId) {
			return null;
		}

		const chat = chats.find((chatItem) => chatItem.id === activeChatId);

		if (!chat) {
			return null;
		}

		const members = chat.memberIds
			.map((memberId) => usersById.get(memberId))
			.filter((member): member is User => Boolean(member));

		const subtitle =
			chat.type === 'group' ? `${members.length} members in this workspace` : 'Direct conversation';

		return {
			id: chat.id,
			title: resolveChatTitle(chat, currentUserId, usersById),
			subtitle,
			avatarUrl: resolveChatAvatar(chat, currentUserId, usersById),
			isOnline: resolveChatOnlineStatus(chat, currentUserId, onlineUserSet),
			chat,
			members,
		};
	}, [activeChatId, chats, currentUserId, onlineUserSet, usersById]);

	const currentUser = usersById.get(currentUserId) ?? null;

	const selectChat = (chatId: string) => {
		setActiveChat(chatId);
		markChatRead(chatId);
	};

	return {
		currentUser,
		usersById,
		theme,
		toggleTheme,
		activeChatId,
		activeChat,
		chatItems,
		searchQuery,
		setSearchQuery,
		selectChat,
		isLoading: isChatLoading || isUserLoading,
		loadError,
	};
};
