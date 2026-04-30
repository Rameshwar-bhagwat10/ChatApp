import type { ReactNode } from 'react';

interface ChatLayoutProps {
	children: ReactNode;
}

const ChatLayout = ({ children }: ChatLayoutProps) => <>{children}</>;

export default ChatLayout;
