import type { Socket } from 'socket.io';
import { TYPING_EVENTS } from '../events/typing.events';

export const registerTypingHandlers = (socket: Socket): void => {
	socket.on(TYPING_EVENTS.typingStart, () => {
		socket.broadcast.emit(TYPING_EVENTS.userTyping, {
			userId: socket.id,
			isTyping: true,
		});
	});

	socket.on(TYPING_EVENTS.typingStop, () => {
		socket.broadcast.emit(TYPING_EVENTS.userTyping, {
			userId: socket.id,
			isTyping: false,
		});
	});
};
