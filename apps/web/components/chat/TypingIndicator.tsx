interface TypingIndicatorProps {
	users: string[];
}

export const TypingIndicator = ({ users }: TypingIndicatorProps) => {
	if (users.length === 0) {
		return null;
	}

	const displayLabel = users.length === 1 ? `${users[0]} is typing` : `${users.join(', ')} are typing`;

	return (
		<div className="border-theme bg-theme-surface text-theme-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
			<span>{displayLabel}</span>
			<span className="inline-flex items-center gap-1" aria-hidden="true">
				<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:0ms]" />
				<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:100ms]" />
				<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:200ms]" />
			</span>
		</div>
	);
};
