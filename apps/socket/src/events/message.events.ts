export const MESSAGE_EVENTS = {
	sendMessage: 'message:send',
	receiveMessage: 'message:created',
	delivered: 'message:delivered',
	seen: 'message:seen',
	legacySendMessage: 'send_message',
	legacyReceiveMessage: 'receive_message',
} as const;
