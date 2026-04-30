'use client';

import { useAuthStore } from '../../store/useAuthStore';

export const useAuth = () => {
	const currentUserId = useAuthStore((state) => state.currentUserId);
	const setCurrentUserId = useAuthStore((state) => state.setCurrentUserId);
	const theme = useAuthStore((state) => state.theme);
	const setTheme = useAuthStore((state) => state.setTheme);
	const toggleTheme = useAuthStore((state) => state.toggleTheme);

	return {
		currentUserId,
		setCurrentUserId,
		theme,
		setTheme,
		toggleTheme,
	};
};
