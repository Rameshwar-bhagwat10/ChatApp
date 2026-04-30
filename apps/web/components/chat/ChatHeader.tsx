import { Avatar, Button } from '@chat-app/ui';

interface ChatHeaderProps {
	title: string;
	subtitle: string;
	avatarUrl?: string;
	isOnline: boolean;
	connectionStatus: string;
	showBackButton?: boolean;
	onBack?: () => void;
	onOpenSettings: () => void;
}

export const ChatHeader = ({
	title,
	subtitle,
	avatarUrl,
	isOnline,
	connectionStatus,
	showBackButton = false,
	onBack,
	onOpenSettings,
}: ChatHeaderProps) => (
	<header className="surface-panel mb-4 flex items-center justify-between p-4">
		<div className="flex items-center gap-3">
			{showBackButton && onBack ? (
				<Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
					Back
				</Button>
			) : null}
			<Avatar name={title} src={avatarUrl} size="md" isOnline={isOnline} />
			<div className="min-w-0">
				<h1 className="truncate text-heading">{title}</h1>
				<p className="truncate text-small text-theme-muted">{subtitle}</p>
			</div>
		</div>
		<div className="flex items-center gap-2">
			<span className="border-theme text-theme-muted hidden rounded-full border px-2 py-1 text-xs md:inline-flex">
				{connectionStatus}
			</span>
			<Button variant="ghost" size="sm" onClick={onOpenSettings}>
				Settings
			</Button>
		</div>
	</header>
);
