import type { Chat } from '@chat-app/types';

const nowIso = (): string => new Date().toISOString();

export const chatService = {
	listChats: async (): Promise<Chat[]> => [
		{
			id: 'chat-foundation',
			type: 'group',
			name: 'Foundation Chat',
			memberIds: ['phase-1-user'],
			createdAt: nowIso(),
			updatedAt: nowIso(),
		},
	],

	createChat: async (): Promise<Chat> => ({
		id: 'chat-created',
		type: 'group',
		name: 'New Chat',
		memberIds: ['phase-1-user'],
		createdAt: nowIso(),
		updatedAt: nowIso(),
	}),
};
