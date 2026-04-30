import type { User } from '@chat-app/types';
import { Avatar, Button, Tooltip } from '@chat-app/ui';
import type { AppTheme } from '../../lib/constants';

interface SidebarProps {
	currentUser: User | null;
	theme: AppTheme;
	isConnected: boolean;
	connectionLabel: string;
	onToggleTheme: () => void;
	onOpenSettings: () => void;
}

export const Sidebar = ({
	currentUser,
	theme,
	isConnected,
	connectionLabel,
	onToggleTheme,
	onOpenSettings,
}: SidebarProps) => (
	<aside className="border-theme bg-theme-elevated border-b p-3 md:border-b-0 md:border-r">
		<div className="flex h-full items-center justify-between gap-2 md:flex-col md:justify-start">
			<div className="flex items-center gap-2 md:flex-col">
				<Avatar
					name={currentUser?.username ?? 'User'}
					src={currentUser?.avatarUrl}
					size="md"
					isOnline={isConnected}
				/>
				<span className="text-theme-muted text-xs md:hidden">{connectionLabel}</span>
			</div>
			<div className="flex items-center gap-2 md:mt-4 md:flex-col">
				<Tooltip content={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
					<Button variant="ghost" size="sm" onClick={onToggleTheme} aria-label="Toggle theme">
						{theme === 'dark' ? 'Light' : 'Dark'}
					</Button>
				</Tooltip>
				<Tooltip content="Settings">
					<Button variant="ghost" size="sm" onClick={onOpenSettings} aria-label="Open settings">
						Setup
					</Button>
				</Tooltip>
			</div>
		</div>
	</aside>
);
