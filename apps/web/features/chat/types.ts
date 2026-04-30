import type { Chat, User } from '@chat-app/types';

export interface ChatListItemViewModel {
	id: string;
	title: string;
	avatarUrl?: string;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
	isOnline: boolean;
}

export interface ActiveChatViewModel {
	id: string;
	title: string;
	subtitle: string;
	avatarUrl?: string;
	isOnline: boolean;
	chat: Chat;
	members: User[];
}

export interface ChatMessageViewModel {
	id: string;
	chatId: string;
	senderId: string;
	senderName: string;
	senderAvatarUrl?: string;
	content: string;
	createdAt: string;
}
