import type { Message } from '@chat-app/types';

export interface SendMessagePayload {
	chatId: string;
	senderId: string;
	content: string;
}

export interface GetMessagePageParams {
	chatId: string;
	cursor?: string | null;
	limit?: number;
}

export interface MessagePageResponse {
	messages: Message[];
	nextCursor: string | null;
	hasMore: boolean;
	typingUserIds: string[];
}
