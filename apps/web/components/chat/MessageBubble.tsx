import type { ChatMessageViewModel } from '../../features/chat/types';
import { cn, formatTimestamp } from '../../lib/utils';

interface MessageBubbleProps {
	message: ChatMessageViewModel;
	isOwnMessage: boolean;
}

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => (
	<div className={cn('flex w-full', isOwnMessage ? 'justify-end' : 'justify-start')}>
		<div
			className={cn(
				'max-w-[80%] rounded-xl px-4 py-2',
				isOwnMessage ? 'bg-primary-600 text-white' : 'border border-theme bg-theme-surface text-theme',
			)}
		>
			{!isOwnMessage ? <p className="mb-1 text-xs font-medium text-primary-300">{message.senderName}</p> : null}
			<p className="text-body break-words">{message.content}</p>
			<p className={cn('mt-1 text-right text-xs', isOwnMessage ? 'text-primary-100' : 'text-theme-muted')}>
				{formatTimestamp(message.createdAt)}
			</p>
		</div>
	</div>
);
