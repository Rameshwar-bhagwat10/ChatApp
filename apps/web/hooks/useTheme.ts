'use client';

import { useEffect } from 'react';
import { THEME_STORAGE_KEY } from '../lib/constants';
import { useAuthStore } from '../store/useAuthStore';
import type { AppTheme } from '../lib/constants';

const isTheme = (value: string): value is AppTheme => value === 'dark' || value === 'light';

export const useTheme = () => {
	const theme = useAuthStore((state) => state.theme);
	const setTheme = useAuthStore((state) => state.setTheme);

	useEffect(() => {
		const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

		if (storedTheme && isTheme(storedTheme)) {
			setTheme(storedTheme);
		}
	}, [setTheme]);

	useEffect(() => {
		const rootElement = document.documentElement;
		rootElement.classList.remove('dark', 'light');
		rootElement.classList.add(theme);
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	return theme;
};
