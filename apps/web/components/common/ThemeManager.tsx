'use client';

import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeManagerProps {
	children: ReactNode;
}

export const ThemeManager = ({ children }: ThemeManagerProps) => {
	useTheme();
	return <>{children}</>;
};
