import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import '@chat-app/ui/theme/tokens.css';
import { ThemeManager } from '../components/common/ThemeManager';
import '../styles/globals.css';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Distributed Chat App',
	description: 'Production foundation for a scalable distributed chat system',
};

interface RootLayoutProps {
	children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
	<html lang="en" className="dark">
		<body className={`${inter.variable} bg-theme-app text-theme min-h-screen antialiased`}>
			<ThemeManager>{children}</ThemeManager>
		</body>
	</html>
);

export default RootLayout;
