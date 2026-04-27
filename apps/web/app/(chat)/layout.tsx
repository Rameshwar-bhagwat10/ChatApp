import type { ReactNode } from 'react';

interface ChatLayoutProps {
	children: ReactNode;
}

const ChatLayout = ({ children }: ChatLayoutProps) => (
	<div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">{children}</div>
);

export default ChatLayout;
