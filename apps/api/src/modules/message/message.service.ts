import type { Message } from '@chat-app/types';

const nowIso = (): string => new Date().toISOString();

export const messageService = {
	listMessagesByChat: async (chatId: string): Promise<Message[]> => [
		{
			id: 'message-foundation',
			chatId,
			senderId: 'phase-1-user',
			content: 'Phase 1 message placeholder',
			type: 'text',
			status: 'sent',
			createdAt: nowIso(),
			updatedAt: nowIso(),
		},
	],
};
