import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface TooltipProps {
	content: string;
	children: ReactNode;
	position?: 'top' | 'bottom';
}

const positionClassName: Record<NonNullable<TooltipProps['position']>, string> = {
	top: 'bottom-full mb-2',
	bottom: 'top-full mt-2',
};

export const Tooltip = ({ content, children, position = 'top' }: TooltipProps) => (
	<div className="group relative inline-flex">
		{children}
		<span
			className={cn(
				'pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-theme bg-theme-elevated px-2 py-1 text-xs text-theme opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
				positionClassName[position],
			)}
			role="tooltip"
		>
			{content}
		</span>
	</div>
);
