import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
	title: 'Distributed Chat App',
	description: 'Production foundation for a scalable distributed chat system',
};

interface RootLayoutProps {
	children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
	<html lang="en">
		<body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
	</html>
);

export default RootLayout;
