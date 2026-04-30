import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Loader } from './Loader';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	loading?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

const variantClassName: Record<NonNullable<ButtonProps['variant']>, string> = {
	primary: 'bg-primary-600 text-white hover:bg-primary-500',
	secondary: 'border border-theme bg-theme-surface text-theme hover:bg-theme-elevated',
	ghost: 'bg-transparent text-theme hover:bg-theme-elevated',
	success: 'bg-success-600 text-white hover:bg-success-500',
	danger: 'bg-error-600 text-white hover:bg-error-500',
};

const sizeClassName: Record<NonNullable<ButtonProps['size']>, string> = {
	sm: 'h-8 px-3 text-sm',
	md: 'h-10 px-4 text-sm',
	lg: 'h-11 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = 'primary',
			size = 'md',
			loading = false,
			leftIcon,
			rightIcon,
			className,
			children,
			disabled,
			type = 'button',
			...props
		},
		ref,
	) => (
		<button
			ref={ref}
			type={type}
			className={cn(
				'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background))]',
				'disabled:cursor-not-allowed disabled:opacity-50',
				variantClassName[variant],
				sizeClassName[size],
				className,
			)}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? <Loader size="sm" className="border-[rgb(var(--border))] border-r-white" /> : leftIcon}
			<span>{children}</span>
			{!loading && rightIcon}
		</button>
	),
);

Button.displayName = 'Button';
