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
		username: 'Priya Sharma',
		email: 'priya@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=priya',
		createdAt: minutesAgo(500),
		updatedAt: minutesAgo(5),
	},
	{
		id: 'user-3',
		username: 'Mateo Ruiz',
		email: 'mateo@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=mateo',
		createdAt: minutesAgo(640),
		updatedAt: minutesAgo(9),
	},
	{
		id: 'user-4',
		username: 'Design Team',
		email: 'design-team@chat-app.dev',
		avatarUrl: 'https://api.dicebear.com/9.x/thumbs/svg?seed=design',
		createdAt: minutesAgo(900),
		updatedAt: minutesAgo(11),
	},
];

export const MOCK_CHATS: Chat[] = [
	{
		id: 'chat-1',
		type: 'direct',
		memberIds: ['user-1', 'user-2'],
		createdAt: minutesAgo(540),
		updatedAt: minutesAgo(4),
	},
	{
		id: 'chat-2',
		type: 'direct',
		memberIds: ['user-1', 'user-3'],
		createdAt: minutesAgo(610),
		updatedAt: minutesAgo(10),
	},
	{
		id: 'chat-3',
		type: 'group',
		name: 'Product Launch Crew',
		memberIds: ['user-1', 'user-2', 'user-3', 'user-4'],
		createdAt: minutesAgo(1_200),
		updatedAt: minutesAgo(3),
	},
];

export const MOCK_MESSAGES_BY_CHAT: Record<string, Message[]> = {
	'chat-1': [
		{
			id: 'message-1',
			chatId: 'chat-1',
			senderId: 'user-2',
			content: 'Can you review the onboarding copy for the new flow?',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(31),
			updatedAt: minutesAgo(31),
		},
		{
			id: 'message-2',
			chatId: 'chat-1',
			senderId: 'user-1',
			content: 'Reviewed. Left feedback in Figma comments.',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(26),
			updatedAt: minutesAgo(26),
		},
		{
			id: 'message-3',
			chatId: 'chat-1',
			senderId: 'user-2',
			content: 'Perfect, I will update copy and share final by EOD.',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(8),
			updatedAt: minutesAgo(8),
		},
	],
	'chat-2': [
		{
			id: 'message-4',
			chatId: 'chat-2',
			senderId: 'user-3',
			content: 'Latency metrics are trending down after caching patch.',
			type: 'text',
			status: 'seen',
			createdAt: minutesAgo(40),
			updatedAt: minutesAgo(40),
		},
		{
			id: 'message-5',
			chatId: 'chat-2',
			senderId: 'user-1',
			content: 'Great. Ship it after tonight smoke test.',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(11),
			updatedAt: minutesAgo(11),
		},
	],
	'chat-3': [
		{
			id: 'message-6',
			chatId: 'chat-3',
			senderId: 'user-4',
			content: 'Updated marketing visuals are ready in the shared folder.',
			type: 'text',
			status: 'sent',
			createdAt: minutesAgo(15),
			updatedAt: minutesAgo(15),
		},
		{
			id: 'message-7',
			chatId: 'chat-3',
			senderId: 'user-2',
			content: 'Can we freeze scope by tonight so QA can start tomorrow?',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(6),
			updatedAt: minutesAgo(6),
		},
		{
			id: 'message-8',
			chatId: 'chat-3',
			senderId: 'user-3',
			content: 'Yes, I will post final checklist in 20 minutes.',
			type: 'text',
			status: 'delivered',
			createdAt: minutesAgo(3),
			updatedAt: minutesAgo(3),
		},
	],
};

export const MOCK_UNREAD_BY_CHAT: Record<string, number> = {
	'chat-1': 1,
	'chat-2': 0,
	'chat-3': 3,
};

export const MOCK_TYPING_BY_CHAT: Record<string, string[]> = {
	'chat-2': ['user-3'],
};
