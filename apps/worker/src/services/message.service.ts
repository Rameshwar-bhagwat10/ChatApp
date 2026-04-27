import type { Message } from '@chat-app/types';
import type { MessageJobPayload } from '../queues/message.queue';

export class MessageService {
	public async persistMessage(payload: MessageJobPayload): Promise<Message> {
		const now = new Date().toISOString();

		return {
			id: `message-${payload.chatId}-${payload.senderId}`,
			chatId: payload.chatId,
			senderId: payload.senderId,
			content: payload.content,
			type: 'text',
			status: 'sent',
			createdAt: now,
			updatedAt: now,
		};
	}
}
