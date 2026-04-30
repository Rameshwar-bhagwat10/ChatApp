import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Button, Loader } from '@chat-app/ui';
import type { ChatMessageViewModel } from '../../features/chat/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface ChatWindowProps {
	hasActiveChat: boolean;
	isLoading: boolean;
	messages: ChatMessageViewModel[];
	typingUsers: string[];
	currentUserId: string;
	scrollContainerRef: RefObject<HTMLDivElement>;
	hasOlderMessages: boolean;
	onLoadOlderMessages: () => void;
	onScroll: () => void;
}

const MessageSkeleton = () => (
	<div className="space-y-3">
		<div className="skeleton h-12 w-2/3" />
		<div className="skeleton ml-auto h-12 w-1/2" />
		<div className="skeleton h-12 w-3/4" />
	</div>
);

export const ChatWindow = ({
	hasActiveChat,
	isLoading,
	messages,
	typingUsers,
	currentUserId,
	scrollContainerRef,
	hasOlderMessages,
	onLoadOlderMessages,
	onScroll,
}: ChatWindowProps) => {
	const latestIncomingMessage = useMemo(() => {
		if (!hasActiveChat || isLoading) {
			return null;
		}

		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];

			if (message && message.senderId !== currentUserId) {
				return message;
			}
		}

		return null;
	}, [currentUserId, hasActiveChat, isLoading, messages]);

	const liveMessageAnnouncement = useMemo(() => {
		if (!latestIncomingMessage) {
			return '';
		}

		const normalizedContent = latestIncomingMessage.content.trim();
		const messagePreview =
			normalizedContent.length > 120 ? `${normalizedContent.slice(0, 117)}...` : normalizedContent;

		return `New message from ${latestIncomingMessage.senderName}: ${messagePreview}`;
	}, [latestIncomingMessage]);

	const liveTypingAnnouncement = useMemo(() => {
		if (!hasActiveChat || isLoading || typingUsers.length === 0) {
			return '';
		}

		return typingUsers.length === 1
			? `${typingUsers[0]} is typing`
			: `${typingUsers.join(', ')} are typing`;
	}, [hasActiveChat, isLoading, typingUsers]);

	return (
		<div className="surface-panel flex min-h-0 flex-1 flex-col p-4">
			<div className="sr-only" aria-live="polite" aria-atomic="true" aria-relevant="additions text" role="status">
				{liveMessageAnnouncement}
			</div>
			<div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
				{liveTypingAnnouncement}
			</div>
			<div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" onScroll={onScroll}>
				{!isLoading && hasActiveChat && hasOlderMessages ? (
					<div className="flex justify-center py-1">
						<Button variant="ghost" size="sm" onClick={onLoadOlderMessages}>
							Load older messages
						</Button>
					</div>
				) : null}
				{isLoading ? (
					<div className="space-y-3">
						<div className="text-theme-muted flex items-center gap-2 text-small">
							<Loader size="sm" />
							Loading conversations...
						</div>
						<MessageSkeleton />
					</div>
				) : null}
				{!isLoading && !hasActiveChat ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-body text-theme-muted">
							Select a chat from the list to start messaging.
						</p>
					</div>
				) : null}
				{!isLoading && hasActiveChat && messages.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-body text-theme-muted">No messages yet. Start the conversation.</p>
					</div>
				) : null}
				{!isLoading && hasActiveChat
					? messages.map((message) => (
							<MessageBubble
								key={message.id}
								message={message}
								isOwnMessage={message.senderId === currentUserId}
							/>
						))
					: null}
				{!isLoading && hasActiveChat && typingUsers.length > 0 ? <TypingIndicator users={typingUsers} /> : null}
			</div>
		</div>
	);
};
