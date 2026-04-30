import { Avatar } from '@chat-app/ui';
import { cn, formatTimestamp } from '../../lib/utils';

interface ChatListItemProps {
	title: string;
	avatarUrl?: string;
	lastMessage: string;
	lastMessageAt: string;
	unreadCount: number;
	isOnline: boolean;
	isActive: boolean;
	onClick: () => void;
}

export const ChatListItem = ({
	title,
	avatarUrl,
	lastMessage,
	lastMessageAt,
	unreadCount,
	isOnline,
	isActive,
	onClick,
}: ChatListItemProps) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
			isActive
				? 'border-primary-500/50 bg-primary-500/10'
				: 'border-theme bg-theme-surface hover:bg-theme-elevated',
		)}
	>
		<Avatar name={title} src={avatarUrl} size="md" isOnline={isOnline} />
		<div className="min-w-0 flex-1">
			<div className="flex items-start justify-between gap-2">
				<p className="text-theme truncate text-sm font-medium">{title}</p>
				<span className="text-theme-muted shrink-0 text-xs">{formatTimestamp(lastMessageAt)}</span>
			</div>
			<div className="mt-1 flex items-center justify-between gap-2">
				<p className="text-theme-muted truncate text-xs">{lastMessage}</p>
				{unreadCount > 0 ? (
					<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-semibold text-white">
						{unreadCount}
					</span>
				) : null}
			</div>
		</div>
	</button>
);
