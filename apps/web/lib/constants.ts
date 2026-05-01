import type { Chat, Message, User } from '@chat-app/types';

const now = Date.now();

const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

export type AppTheme = 'dark' | 'light';

export const CURRENT_USER_ID = 'user-1';
export const DEFAULT_THEME: AppTheme = 'dark';
export const THEME_STORAGE_KEY = 'chat-app-theme';
export const MOCK_LOADING_DELAY_MS = 700;
export const MOCK_TYPING_CLEAR_MS = 1400;
export const OPTIMISTIC_MESSAGE_ID_PREFIX = 'local-message-';
export const MESSAGE_WINDOW_SIZE = 60;
export const AUTO_SCROLL_THRESHOLD_PX = 56;
export const TYPING_IDLE_TIMEOUT_MS = 1000;
export const MESSAGE_ACK_TIMEOUT_MS = 2_500;
export const MESSAGE_SEND_MAX_RETRIES = 3;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4001';
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
export const ENABLE_REALTIME_SOCKET = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';

export const MOCK_USERS: User[] = [
	{
		id: 'user-1',
		username: 'You',
		email: 'you@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=you',
		createdAt: minutesAgo(300),
		updatedAt: minutesAgo(2),
	},
	{
		id: 'user-2',
		username: 'Sarah Chen',
		email: 'sarah@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=sarah',
		createdAt: minutesAgo(500),
		updatedAt: minutesAgo(5),
	},
	{
		id: 'user-3',
		username: 'Alex Kumar',
		email: 'alex@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=alex',
		createdAt: minutesAgo(640),
		updatedAt: minutesAgo(9),
	},
	{
		id: 'user-4',
		username: 'Emma Wilson',
		email: 'emma@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=emma',
		createdAt: minutesAgo(900),
		updatedAt: minutesAgo(11),
	},
	{
		id: 'user-5',
		username: 'Jordan Lee',
		email: 'jordan@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=jordan',
		createdAt: minutesAgo(1_200),
		updatedAt: minutesAgo(1),
	},
];

export const MOCK_CHATS: Chat[] = [
	{
		id: 'chat-1',
		type: 'direct',
		memberIds: ['user-1', 'user-2'],
		createdAt: minutesAgo(540),
		updatedAt: minutesAgo(2),
	},
	{
		id: 'chat-2',
		type: 'direct',
		memberIds: ['user-1', 'user-3'],
		createdAt: minutesAgo(610),
		updatedAt: minutesAgo(8),
	},
	{
		id: 'chat-3',
		type: 'group',
		name: '🚀 Product Launch',
		memberIds: ['user-1', 'user-2', 'user-3', 'user-4'],
		createdAt: minutesAgo(1_200),
		updatedAt: minutesAgo(1),
	},
	{
		id: 'chat-4',
		type: 'direct',
		memberIds: ['user-1', 'user-5'],
		createdAt: minutesAgo(2_400),
		updatedAt: minutesAgo(120),
	},
	{
		id: 'chat-5',
		type: 'group',
		name: '💻 Engineering Team',
		memberIds: ['user-1', 'user-3', 'user-5'],
		createdAt: minutesAgo(3_600),
		updatedAt: minutesAgo(35),
	},
];

export const MOCK_MESSAGES_BY_CHAT: Record<string, Message[]> = {
	'chat-1': [
		{
			id: 'message-1',
			chatId: 'chat-1',
			senderId: 'user-2',
			content: '👋 Hey! Did you see the new design mockups?',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(45),
			updatedAt: minutesAgo(45),
		},
		{
			id: 'message-2',
			chatId: 'chat-1',
			senderId: 'user-1',
			content: 'Just looked at them! Really impressed with the flow 🎨',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(35),
			updatedAt: minutesAgo(35),
		},
		{
			id: 'message-3',
			chatId: 'chat-1',
			senderId: 'user-2',
			content: 'Thanks! I made a few iterations based on feedback. Let me send the updated version.',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(25),
			updatedAt: minutesAgo(25),
		},
		{
			id: 'message-4',
			chatId: 'chat-1',
			senderId: 'user-1',
			content: 'Perfect, I\'ll review and get back to you by EOD 👍',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(2),
			updatedAt: minutesAgo(2),
		},
	],
	'chat-2': [
		{
			id: 'message-5',
			chatId: 'chat-2',
			senderId: 'user-3',
			content: 'The API performance metrics look great after the optimization',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(120),
			updatedAt: minutesAgo(120),
		},
		{
			id: 'message-6',
			chatId: 'chat-2',
			senderId: 'user-1',
			content: 'Excellent work! Response time is down 40% ⚡',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(60),
			updatedAt: minutesAgo(60),
		},
	],
	'chat-3': [
		{
			id: 'message-7',
			chatId: 'chat-3',
			senderId: 'user-4',
			content: 'Updated marketing visuals are ready in the shared folder 📁',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(90),
			updatedAt: minutesAgo(90),
		},
		{
			id: 'message-8',
			chatId: 'chat-3',
			senderId: 'user-2',
			content: 'Can we freeze scope by end of day so QA can start testing tomorrow? 🧪',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(60),
			updatedAt: minutesAgo(60),
		},
		{
			id: 'message-9',
			chatId: 'chat-3',
			senderId: 'user-3',
			content: 'Yes, I\'ll send the final checklist in 1 hour ✅',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(45),
			updatedAt: minutesAgo(45),
		},
		{
			id: 'message-10',
			chatId: 'chat-3',
			senderId: 'user-1',
			content: 'Great! Looking forward to the launch next week 🚀',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(1),
			updatedAt: minutesAgo(1),
		},
	],
	'chat-4': [
		{
			id: 'message-11',
			chatId: 'chat-4',
			senderId: 'user-5',
			content: 'Hi! Will you be at the team standup tomorrow?',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(2_400),
			updatedAt: minutesAgo(2_400),
		},
	],
	'chat-5': [
		{
			id: 'message-12',
			chatId: 'chat-5',
			senderId: 'user-3',
			content: 'PR is ready for review when you have time 📝',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(150),
			updatedAt: minutesAgo(150),
		},
		{
			id: 'message-13',
			chatId: 'chat-5',
			senderId: 'user-1',
			content: 'Will check it out in the next review cycle 👀',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(120),
			updatedAt: minutesAgo(120),
		},
		{
			id: 'message-14',
			chatId: 'chat-5',
			senderId: 'user-5',
			content: 'Thanks! Let me know if you have any questions 🙌',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(35),
			updatedAt: minutesAgo(35),
		},
	],
};

export const MOCK_UNREAD_BY_CHAT: Record<string, number> = {
	'chat-1': 0,
	'chat-2': 0,
	'chat-3': 0,
	'chat-4': 1,
	'chat-5': 0,
};

export const MOCK_TYPING_BY_CHAT: Record<string, string[]> = {
	'chat-1': [],
};
