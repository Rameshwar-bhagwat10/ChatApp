import { ChatDashboard } from '../../../features/chat/ChatDashboard';

interface ChatRoomPageProps {
	params: {
		chatId: string;
	};
}

const ChatRoomPage = ({ params }: ChatRoomPageProps) => <ChatDashboard initialChatId={params.chatId} />;

export default ChatRoomPage;
