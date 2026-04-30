import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
	size?: 'sm' | 'md' | 'lg';
}

const sizeClassName: Record<NonNullable<LoaderProps['size']>, string> = {
	sm: 'h-4 w-4 border-2',
	md: 'h-6 w-6 border-2',
	lg: 'h-8 w-8 border-[3px]',
};

export const Loader = ({ size = 'md', className, ...props }: LoaderProps) => (
	<div
		className={cn(
			'inline-block animate-spin rounded-full border-[rgb(var(--border))] border-r-primary-500',
			sizeClassName[size],
			className,
		)}
		aria-label="Loading"
		role="status"
		{...props}
	/>
);
