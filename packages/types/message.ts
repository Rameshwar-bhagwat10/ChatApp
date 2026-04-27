export type MessageType = 'text' | 'image' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface Message {
	id: string;
	chatId: string;
	senderId: string;
	content: string;
	type: MessageType;
	status: MessageStatus;
	createdAt: string;
	updatedAt: string;
}
