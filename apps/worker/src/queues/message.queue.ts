export const MESSAGE_QUEUE_NAME = 'message-processing';

export interface MessageJobPayload {
	chatId: string;
	senderId: string;
	content: string;
}
