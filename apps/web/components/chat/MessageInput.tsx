import { Button, Input } from '@chat-app/ui';

interface MessageInputProps {
	value: string;
	disabled?: boolean;
	onValueChange: (value: string) => void;
	onSend: () => void;
	onEmojiClick: () => void;
}

export const MessageInput = ({ value, disabled = false, onValueChange, onSend, onEmojiClick }: MessageInputProps) => (
	<div className="surface-panel mt-4 p-3">
		<div className="flex items-center gap-2">
			<Input
				id="message-input"
				placeholder="Type your message..."
				value={value}
				disabled={disabled}
				onChange={(event) => onValueChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						onSend();
					}
				}}
				rightSlot={
					<button
						type="button"
						className="text-theme-muted hover:bg-theme-elevated rounded-md p-1 transition-colors hover:text-theme"
						aria-label="Insert emoji placeholder"
						onClick={onEmojiClick}
					>
						:)
					</button>
				}
			/>
			<Button onClick={onSend} disabled={disabled || !value.trim()}>
				Send
			</Button>
		</div>
	</div>
);
