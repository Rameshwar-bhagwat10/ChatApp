import { Input, Loader } from '@chat-app/ui';
import type { ChatListItemViewModel } from '../../features/chat/types';
import { ChatListItem } from '../chat/ChatListItem';

interface ChatListProps {
	items: ChatListItemViewModel[];
	activeChatId: string | null;
	searchQuery: string;
	isLoading: boolean;
	onSearchChange: (value: string) => void;
	onSelectChat: (chatId: string) => void;
}

const ListSkeleton = () => (
	<div className="space-y-3 px-1">
		<div className="skeleton h-16 w-full" />
		<div className="skeleton h-16 w-full" />
		<div className="skeleton h-16 w-full" />
	</div>
);

export const ChatList = ({
	items,
	activeChatId,
	searchQuery,
	isLoading,
	onSearchChange,
	onSelectChat,
}: ChatListProps) => (
	<aside className="border-theme bg-theme-elevated min-h-0 border-b p-4 md:border-b-0 md:border-r md:p-5">
		<div className="mb-4">
			<h2 className="text-heading">Chats</h2>
			<p className="text-small text-theme-muted">Recent conversations and unread activity.</p>
		</div>
		<Input
			id="chat-search"
			placeholder="Search chats..."
			value={searchQuery}
			onChange={(event) => onSearchChange(event.target.value)}
		/>
		<div className="mt-4 max-h-[calc(100dvh-var(--chat-list-height-offset))] space-y-3 overflow-y-auto pr-1">
			{isLoading ? (
				<div className="space-y-3">
					<div className="text-theme-muted flex items-center gap-2 text-small">
						<Loader size="sm" />
						Syncing conversations...
					</div>
					<ListSkeleton />
				</div>
			) : null}
			{!isLoading && items.length === 0 ? (
				<div className="border-theme rounded-xl border border-dashed p-6 text-center">
					<p className="text-body text-theme-muted">No chats match your search.</p>
				</div>
			) : null}
			{!isLoading
				? items.map((item) => (
						<ChatListItem
							key={item.id}
							title={item.title}
							avatarUrl={item.avatarUrl}
							lastMessage={item.lastMessage}
							lastMessageAt={item.lastMessageAt}
							unreadCount={item.unreadCount}
							isOnline={item.isOnline}
							isActive={activeChatId === item.id}
							onClick={() => onSelectChat(item.id)}
						/>
					))
				: null}
		</div>
	</aside>
);
