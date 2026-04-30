export type ThemeMode = 'dark' | 'light';

export const themeVariableNames = {
	background: '--background',
	surface: '--surface',
	surfaceElevated: '--surface-elevated',
	surfaceOverlay: '--surface-overlay',
	border: '--border',
	text: '--text',
	textMuted: '--text-muted',
	skeleton: '--skeleton',
	ring: '--ring',
	layoutSidebarWidth: '--layout-sidebar-width',
	layoutChatListWidth: '--layout-chat-list-width',
	layoutMaxWidth: '--layout-max-width',
	layoutMobileChatMinHeight: '--layout-mobile-chat-min-height',
	chatListHeightOffset: '--chat-list-height-offset',
} as const;

export const themeTokens = {
	dark: {
		background: '2 6 23',
		surface: '15 23 42',
		surfaceElevated: '30 41 59',
		surfaceOverlay: '2 6 23',
		border: '51 65 85',
		text: '241 245 249',
		textMuted: '148 163 184',
		skeleton: '51 65 85',
		ring: '99 102 241',
	},
	light: {
		background: '248 250 252',
		surface: '255 255 255',
		surfaceElevated: '241 245 249',
		surfaceOverlay: '15 23 42',
		border: '203 213 225',
		text: '15 23 42',
		textMuted: '71 85 105',
		skeleton: '226 232 240',
		ring: '79 70 229',
	},
	layout: {
		sidebarWidth: '84px',
		chatListWidth: '360px',
		maxWidth: '1600px',
		mobileChatMinHeight: '55vh',
		chatListHeightOffset: '220px',
	},
} as const;
