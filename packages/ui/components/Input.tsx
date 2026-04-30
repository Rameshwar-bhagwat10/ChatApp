import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
	leftSlot?: ReactNode;
	rightSlot?: ReactNode;
	wrapperClassName?: string;
}

export const Input = ({
	label,
	error,
	hint,
	leftSlot,
	rightSlot,
	className,
	wrapperClassName,
	id,
	...props
}: InputProps) => {
	const hintId = id ? `${id}-hint` : undefined;
	const errorId = id ? `${id}-error` : undefined;
	const describedBy = error ? errorId : hint ? hintId : undefined;

	return (
		<div className={cn('w-full', wrapperClassName)}>
			{label ? (
				<label htmlFor={id} className="mb-2 block text-sm font-medium text-theme-muted">
					{label}
				</label>
			) : null}
			<div
				className={cn(
					'flex h-10 items-center gap-2 rounded-lg border border-theme bg-theme-surface px-3',
					'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
					error ? 'border-error-500 focus-within:border-error-500 focus-within:ring-error-500/20' : '',
				)}
			>
				{leftSlot}
				<input
					id={id}
					className={cn(
						'h-full w-full border-none bg-transparent text-sm text-theme placeholder:text-[rgb(var(--text-muted))] focus:outline-none',
						className,
					)}
					aria-describedby={describedBy}
					aria-invalid={Boolean(error)}
					{...props}
				/>
				{rightSlot}
			</div>
			{error ? (
				<p id={errorId} className="mt-1 text-xs text-error-400">
					{error}
				</p>
			) : null}
			{!error && hint ? (
				<p id={hintId} className="mt-1 text-xs text-theme-muted">
					{hint}
				</p>
			) : null}
		</div>
	);
};
