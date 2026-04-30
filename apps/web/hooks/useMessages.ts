'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message, User } from '@chat-app/types';
import {
	AUTO_SCROLL_THRESHOLD_PX,
	MESSAGE_ACK_TIMEOUT_MS,
	MESSAGE_SEND_MAX_RETRIES,
	MESSAGE_WINDOW_SIZE,
	MOCK_TYPING_CLEAR_MS,
	TYPING_IDLE_TIMEOUT_MS,
} from '../lib/constants';
import { createOptimisticMessage, getMessagePageByChat } from '../features/message/api';
import { useAuthStore } from '../store/useAuthStore';
import { useMessageStore } from '../store/useMessageStore';
import type { ChatMessageViewModel } from '../features/chat/types';
import type { ChatSocketClient, MessageSendPayload, TypingUpdatedPayload } from '../services/socket';

interface UseMessagesOptions {
	activeChatId: string | null;
	chatMemberIds: string[];
	usersById: Map<string, User>;
	socket: ChatSocketClient | null;
	isRealtimeEnabled: boolean;
}

interface ChatPaginationState {
	nextCursor: string | null;
	hasMore: boolean;
	isLoadingOlder: boolean;
}

const emptyMessages: never[] = [];
const emptyTypingUsers: never[] = [];
const messageRetryDelayMs = 350;

const isNearBottom = (container: HTMLDivElement) =>
	container.scrollHeight - container.scrollTop - container.clientHeight <= AUTO_SCROLL_THRESHOLD_PX;

const wait = (delayMs: number) =>
	new Promise<void>((resolve) => {
		window.setTimeout(() => resolve(), delayMs);
	});

const toErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const useMessages = ({
	activeChatId,
	chatMemberIds,
	usersById,
	socket,
	isRealtimeEnabled,
}: UseMessagesOptions) => {
	const currentUserId = useAuthStore((state) => state.currentUserId);

	const messagesByChat = useMessageStore((state) => state.messagesByChat);
	const typingByChat = useMessageStore((state) => state.typingByChat);
	const isLoading = useMessageStore((state) => state.isLoading);
	const setLoading = useMessageStore((state) => state.setLoading);
	const setMessagesForChat = useMessageStore((state) => state.setMessagesForChat);
	const prependMessages = useMessageStore((state) => state.prependMessages);
	const addMessage = useMessageStore((state) => state.addMessage);
	const removeMessage = useMessageStore((state) => state.removeMessage);
	const setTypingUsers = useMessageStore((state) => state.setTypingUsers);

	const [draft, setDraft] = useState('');
	const [paginationByChat, setPaginationByChat] = useState<Record<string, ChatPaginationState>>({});
	const [loadError, setLoadError] = useState<string | null>(null);
	const [sendError, setSendError] = useState<string | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const mockTypingTimeoutRef = useRef<number | null>(null);
	const typingStopTimeoutRef = useRef<number | null>(null);
	const isTypingRef = useRef(false);
	const isUserNearBottomRef = useRef(true);
	const forceAutoScrollRef = useRef(false);

	const activePagination = activeChatId ? paginationByChat[activeChatId] : undefined;
	const messages = activeChatId ? messagesByChat[activeChatId] ?? emptyMessages : emptyMessages;
	const typingUserIds = activeChatId ? typingByChat[activeChatId] ?? emptyTypingUsers : emptyTypingUsers;

	const messageItems = useMemo<ChatMessageViewModel[]>(
		() =>
			messages.map((message) => {
				const sender = usersById.get(message.senderId);

				return {
					id: message.id,
					chatId: message.chatId,
					senderId: message.senderId,
					senderName: sender?.username ?? 'Unknown user',
					senderAvatarUrl: sender?.avatarUrl,
					content: message.content,
					createdAt: message.createdAt,
				};
			}),
		[messages, usersById],
	);

	const typingUsers = useMemo(
		() =>
			typingUserIds
				.filter((userId) => userId !== currentUserId)
				.map((userId) => usersById.get(userId)?.username ?? 'Someone'),
		[currentUserId, typingUserIds, usersById],
	);

	const scrollToBottom = useCallback(() => {
		const container = scrollContainerRef.current;

		if (!container) {
			return;
		}

		container.scrollTop = container.scrollHeight;
		isUserNearBottomRef.current = true;
	}, []);

	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current;

		if (!container) {
			return;
		}

		isUserNearBottomRef.current = isNearBottom(container);
	}, []);

	useEffect(() => {
		isUserNearBottomRef.current = true;
		forceAutoScrollRef.current = true;
		setSendError(null);
	}, [activeChatId]);

	useEffect(() => {
		if (!activeChatId || activePagination) {
			return;
		}

		let isMounted = true;

		const loadInitialMessages = async () => {
			setLoading(true);
			setLoadError(null);

			try {
				const page = await getMessagePageByChat({
					chatId: activeChatId,
					limit: MESSAGE_WINDOW_SIZE,
				});

				if (!isMounted) {
					return;
				}

				setMessagesForChat(activeChatId, page.messages);
				setTypingUsers(activeChatId, page.typingUserIds);
				setPaginationByChat((currentState) => ({
					...currentState,
					[activeChatId]: {
						nextCursor: page.nextCursor,
						hasMore: page.hasMore,
						isLoadingOlder: false,
					},
				}));
				forceAutoScrollRef.current = true;
			} catch (error) {
				if (isMounted) {
					setLoadError(toErrorMessage(error, 'Failed to load messages'));
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		void loadInitialMessages();

		return () => {
			isMounted = false;
		};
	}, [activeChatId, activePagination, setLoading, setMessagesForChat, setTypingUsers]);

	useEffect(() => {
		if (!activeChatId) {
			return;
		}

		window.requestAnimationFrame(() => {
			scrollToBottom();
		});
	}, [activeChatId, scrollToBottom]);

	const latestMessageId = messages[messages.length - 1]?.id ?? null;

	useEffect(() => {
		if (!scrollContainerRef.current) {
			return;
		}

		if (!isUserNearBottomRef.current && !forceAutoScrollRef.current) {
			return;
		}

		scrollToBottom();
		forceAutoScrollRef.current = false;
	}, [latestMessageId, scrollToBottom, typingUsers.length]);

	const loadOlderMessages = useCallback(() => {
		if (!activeChatId || !activePagination || !activePagination.hasMore || activePagination.isLoadingOlder) {
			return;
		}

		const previousHeight = scrollContainerRef.current?.scrollHeight ?? null;

		setPaginationByChat((currentState) => {
			const currentPagination = currentState[activeChatId] ?? activePagination;

			return {
				...currentState,
				[activeChatId]: {
					nextCursor: currentPagination.nextCursor,
					hasMore: currentPagination.hasMore,
					isLoadingOlder: true,
				},
			};
		});

		const loadOlderPage = async () => {
			try {
				const page = await getMessagePageByChat({
					chatId: activeChatId,
					cursor: activePagination.nextCursor,
					limit: MESSAGE_WINDOW_SIZE,
				});

				prependMessages(activeChatId, page.messages);
				setPaginationByChat((currentState) => ({
					...currentState,
					[activeChatId]: {
						nextCursor: page.nextCursor,
						hasMore: page.hasMore,
						isLoadingOlder: false,
					},
				}));

				window.requestAnimationFrame(() => {
					const container = scrollContainerRef.current;

					if (!container || previousHeight === null) {
						return;
					}

					container.scrollTop += container.scrollHeight - previousHeight;
				});
			} catch (error) {
				setLoadError(toErrorMessage(error, 'Failed to load older messages'));
				setPaginationByChat((currentState) => {
					const currentPagination = currentState[activeChatId] ?? activePagination;

					return {
						...currentState,
						[activeChatId]: {
							nextCursor: currentPagination.nextCursor,
							hasMore: currentPagination.hasMore,
							isLoadingOlder: false,
						},
					};
				});
			}
		};

		void loadOlderPage();
	}, [activeChatId, activePagination, prependMessages]);

	useEffect(() => {
		if (!isRealtimeEnabled || !socket) {
			return;
		}

		const handleMessageCreated = (message: Message) => {
			addMessage(message);
		};

		const handleTypingUpdated = (payload: TypingUpdatedPayload) => {
			setTypingUsers(payload.chatId, payload.userIds);
		};

		socket.on('message:created', handleMessageCreated);
		socket.on('typing:updated', handleTypingUpdated);

		return () => {
			socket.off('message:created', handleMessageCreated);
			socket.off('typing:updated', handleTypingUpdated);
		};
	}, [addMessage, isRealtimeEnabled, setTypingUsers, socket]);

	useEffect(() => {
		return () => {
			if (mockTypingTimeoutRef.current) {
				window.clearTimeout(mockTypingTimeoutRef.current);
			}

			if (typingStopTimeoutRef.current) {
				window.clearTimeout(typingStopTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!isRealtimeEnabled || !socket || !activeChatId || !socket.connected) {
			return;
		}

		const draftHasContent = draft.trim().length > 0;

		if (!draftHasContent) {
			if (isTypingRef.current) {
				socket.emit('typing:stop', { chatId: activeChatId, userId: currentUserId });
				isTypingRef.current = false;
			}

			if (typingStopTimeoutRef.current) {
				window.clearTimeout(typingStopTimeoutRef.current);
				typingStopTimeoutRef.current = null;
			}

			return;
		}

		if (!isTypingRef.current) {
			socket.emit('typing:start', { chatId: activeChatId, userId: currentUserId });
			isTypingRef.current = true;
		}

		if (typingStopTimeoutRef.current) {
			window.clearTimeout(typingStopTimeoutRef.current);
		}

		typingStopTimeoutRef.current = window.setTimeout(() => {
			if (socket.connected && isTypingRef.current) {
				socket.emit('typing:stop', { chatId: activeChatId, userId: currentUserId });
				isTypingRef.current = false;
			}
		}, TYPING_IDLE_TIMEOUT_MS);
	}, [activeChatId, currentUserId, draft, isRealtimeEnabled, socket]);

	useEffect(() => {
		return () => {
			if (!activeChatId || !isTypingRef.current || !isRealtimeEnabled || !socket?.connected) {
				return;
			}

			socket.emit('typing:stop', { chatId: activeChatId, userId: currentUserId });
			isTypingRef.current = false;
		};
	}, [activeChatId, currentUserId, isRealtimeEnabled, socket]);

	const simulateTypingIndicator = useCallback(() => {
		if (!activeChatId) {
			return;
		}

		const candidateUserId = chatMemberIds.find((memberId) => memberId !== currentUserId);

		if (!candidateUserId) {
			return;
		}

		setTypingUsers(activeChatId, [candidateUserId]);

		if (mockTypingTimeoutRef.current) {
			window.clearTimeout(mockTypingTimeoutRef.current);
		}

		mockTypingTimeoutRef.current = window.setTimeout(() => {
			setTypingUsers(activeChatId, []);
		}, MOCK_TYPING_CLEAR_MS);
	}, [activeChatId, chatMemberIds, currentUserId, setTypingUsers]);

	const sendMessageWithRetry = useCallback(
		async (payload: MessageSendPayload) => {
			let lastError: unknown;

			for (let attempt = 1; attempt <= MESSAGE_SEND_MAX_RETRIES; attempt += 1) {
				try {
					if (!socket || !socket.connected) {
						throw new Error('Realtime socket disconnected');
					}

					return await socket.sendMessageWithAck(payload, MESSAGE_ACK_TIMEOUT_MS);
				} catch (error) {
					lastError = error;

					if (attempt < MESSAGE_SEND_MAX_RETRIES) {
						await wait(messageRetryDelayMs);
					}
				}
			}

			throw lastError instanceof Error ? lastError : new Error('Message delivery failed');
		},
		[socket],
	);

	const handleSend = useCallback(() => {
		if (!activeChatId) {
			return;
		}

		const trimmedDraft = draft.trim();

		if (!trimmedDraft) {
			return;
		}

		const optimisticMessage = createOptimisticMessage({
			chatId: activeChatId,
			senderId: currentUserId,
			content: trimmedDraft,
		});

		addMessage(optimisticMessage);
		forceAutoScrollRef.current = true;
		setDraft('');
		setSendError(null);

		if (isRealtimeEnabled) {
			const payload: MessageSendPayload = {
				chatId: activeChatId,
				content: trimmedDraft,
				type: 'text',
				senderId: currentUserId,
				clientMessageId: optimisticMessage.id,
			};

			if (isTypingRef.current && socket?.connected) {
				socket.emit('typing:stop', { chatId: activeChatId, userId: currentUserId });
				isTypingRef.current = false;
			}

			void sendMessageWithRetry(payload)
				.then((ack) => {
					if (ack.message) {
						addMessage(ack.message);
						return;
					}

					if (ack.serverMessageId) {
						addMessage({
							...optimisticMessage,
							id: ack.serverMessageId,
							updatedAt: new Date().toISOString(),
						});
					}
				})
				.catch((error) => {
					removeMessage(activeChatId, optimisticMessage.id);
					setDraft((currentDraft) => currentDraft || trimmedDraft);
					setSendError(toErrorMessage(error, 'Message delivery failed after retries'));
				});

			return;
		}

		simulateTypingIndicator();
	}, [
		activeChatId,
		addMessage,
		currentUserId,
		draft,
		isRealtimeEnabled,
		removeMessage,
		sendMessageWithRetry,
		simulateTypingIndicator,
		socket,
	]);

	const appendEmojiPlaceholder = useCallback(() => {
		setDraft((currentValue) => `${currentValue}${currentValue ? ' ' : ''}:)`);
	}, []);

	return {
		draft,
		setDraft,
		messageItems,
		typingUsers,
		scrollContainerRef,
		handleSend,
		appendEmojiPlaceholder,
		isLoading,
		loadError: sendError ?? loadError,
		hasOlderMessages: activePagination?.hasMore ?? false,
		loadOlderMessages,
		handleScroll,
	};
};
