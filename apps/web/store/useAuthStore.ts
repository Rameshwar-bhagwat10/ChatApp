import { create } from 'zustand';
import { CURRENT_USER_ID, DEFAULT_THEME } from '../lib/constants';
import type { AppTheme } from '../lib/constants';

interface AuthStore {
	currentUserId: string;
	theme: AppTheme;
	setCurrentUserId: (userId: string) => void;
	setTheme: (theme: AppTheme) => void;
	toggleTheme: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
	currentUserId: CURRENT_USER_ID,
	theme: DEFAULT_THEME,
	setCurrentUserId: (userId) => set({ currentUserId: userId }),
	setTheme: (theme) => set({ theme }),
	toggleTheme: () =>
		set((state) => ({
			theme: state.theme === 'dark' ? 'light' : 'dark',
		})),
}));
