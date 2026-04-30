'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@chat-app/ui';
import { MessageInput } from '../../components/chat/MessageInput';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { ChatList } from '../../components/sidebar/ChatList';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { useChat } from '../../hooks/useChat';
import { useMessages } from '../../hooks/useMessages';
import { useSocket } from '../../hooks/useSocket';
import { cn } from '../../lib/utils';

interface ChatDashboardProps {
	initialChatId?: string;
}

export const ChatDashboard = ({ initialChatId }: ChatDashboardProps) => {
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
	const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
	const { socket, isConnected, isRealtimeEnabled, connectionLabel } = useSocket();

	const {
		currentUser,
		theme,
		toggleTheme,
		activeChat,
		activeChatId,
		chatItems,
		searchQuery,
		setSearchQuery,
		selectChat,
		usersById,
		isLoading,
		loadError,
	} = useChat({
		initialChatId,
		socket,
		isRealtimeEnabled,
	});
	const {
		draft,
		setDraft,
		messageItems,
		typingUsers,
		scrollContainerRef,
		handleSend,
		appendEmojiPlaceholder,
		isLoading: isMessageLoading,
		loadError: messageLoadError,
		hasOlderMessages,
		loadOlderMessages,
		handleScroll,
	} = useMessages({
		activeChatId,
		chatMemberIds: activeChat?.chat.memberIds ?? [],
		usersById,
		socket,
		isRealtimeEnabled,
	});

	useEffect(() => {
		if (activeChatId) {
			setMobileView('chat');
		}
	}, [activeChatId]);

	const onSelectChat = (chatId: string) => {
		selectChat(chatId);
		setMobileView('chat');
	};

	const isDashboardLoading = isLoading || isMessageLoading;
	const dashboardError = loadError ?? messageLoadError;
	const shouldShowMobileChat = mobileView === 'chat' && Boolean(activeChatId);

	return (
		<main className="bg-theme-app text-theme min-h-screen md:h-screen md:overflow-hidden">
			<div className="mx-auto flex min-h-screen max-w-[var(--layout-max-width)] flex-col md:grid md:h-full md:grid-cols-[var(--layout-sidebar-width)_var(--layout-chat-list-width)_minmax(0,1fr)]">
				<Sidebar
					currentUser={currentUser}
					isConnected={isRealtimeEnabled ? isConnected : true}
					connectionLabel={connectionLabel}
					theme={theme}
					onToggleTheme={toggleTheme}
					onOpenSettings={() => setIsSettingsModalOpen(true)}
				/>
				<div className={cn(shouldShowMobileChat ? 'hidden md:block md:min-h-0' : 'block md:min-h-0')}>
					<ChatList
						items={chatItems}
						activeChatId={activeChatId}
						searchQuery={searchQuery}
						isLoading={isDashboardLoading}
						onSearchChange={setSearchQuery}
						onSelectChat={onSelectChat}
					/>
				</div>
				<section
					className={cn(
						'border-theme bg-theme-app flex min-h-[var(--layout-mobile-chat-min-height)] flex-1 flex-col border-t p-4 md:min-h-0 md:border-l md:border-t-0 md:p-6',
						shouldShowMobileChat ? 'flex' : 'hidden md:flex',
					)}
				>
					{dashboardError ? (
						<div className="mb-3 rounded-lg border border-error-500/40 bg-error-500/10 px-3 py-2 text-xs text-error-600">
							{dashboardError}
						</div>
					) : null}
					<ChatHeader
						title={activeChat?.title ?? 'Select a conversation'}
						subtitle={activeChat?.subtitle ?? 'Pick a chat from the list to start messaging'}
						avatarUrl={activeChat?.avatarUrl}
						isOnline={activeChat?.isOnline ?? false}
						connectionStatus={connectionLabel}
						showBackButton={Boolean(activeChatId)}
						onBack={() => setMobileView('list')}
						onOpenSettings={() => setIsSettingsModalOpen(true)}
					/>
					<ChatWindow
						hasActiveChat={Boolean(activeChat)}
						isLoading={isDashboardLoading}
						messages={messageItems}
						typingUsers={typingUsers}
						currentUserId={currentUser?.id ?? ''}
						scrollContainerRef={scrollContainerRef}
						hasOlderMessages={hasOlderMessages}
						onLoadOlderMessages={loadOlderMessages}
						onScroll={handleScroll}
					/>
					<MessageInput
						value={draft}
						onValueChange={setDraft}
						onSend={handleSend}
						onEmojiClick={appendEmojiPlaceholder}
						disabled={!activeChatId || isDashboardLoading}
					/>
				</section>
			</div>
			<Modal
				isOpen={isSettingsModalOpen}
				title="Workspace settings"
				description="This panel is mock-only for Phase 2 foundation."
				onClose={() => setIsSettingsModalOpen(false)}
				footer={
					<div className="flex items-center justify-between gap-3">
						<Button variant="secondary" onClick={toggleTheme}>
							Switch to {theme === 'dark' ? 'light' : 'dark'} mode
						</Button>
						<Button onClick={() => setIsSettingsModalOpen(false)}>Done</Button>
					</div>
				}
			>
				<div className="space-y-4">
					<p className="text-body text-theme-muted">
						Real settings can plug into this modal without changing the dashboard layout architecture.
					</p>
				</div>
			</Modal>
		</main>
	);
};
