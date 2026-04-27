interface ChatRoomPageProps {
	params: {
		chatId: string;
	};
}

const ChatRoomPage = ({ params }: ChatRoomPageProps) => (
	<main className="rounded-xl border border-slate-800 bg-slate-900/70 p-8">
		<h1 className="text-2xl font-semibold">Chat Room Placeholder</h1>
		<p className="mt-3 text-slate-400">Active room id: {params.chatId}</p>
	</main>
);

export default ChatRoomPage;
