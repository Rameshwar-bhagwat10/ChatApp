import { cn } from '../lib/cn';

interface AvatarProps {
	name: string;
	src?: string;
	size?: 'sm' | 'md' | 'lg';
	isOnline?: boolean;
	className?: string;
}

const sizeClassName: Record<NonNullable<AvatarProps['size']>, string> = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base',
};

const getInitials = (name: string) =>
	name
		.split(' ')
		.map((token) => token.charAt(0).toUpperCase())
		.slice(0, 2)
		.join('');

export const Avatar = ({ name, src, size = 'md', isOnline = false, className }: AvatarProps) => (
	<div className={cn('relative inline-flex shrink-0', className)}>
		{src ? (
			<img src={src} alt={name} className={cn('inline-flex rounded-full object-cover', sizeClassName[size])} />
		) : (
			<span
				className={cn(
					'inline-flex items-center justify-center rounded-full bg-primary-600 font-semibold text-white',
					sizeClassName[size],
				)}
				aria-label={name}
			>
				{getInitials(name)}
			</span>
		)}
		{isOnline ? (
			<span
				className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-success-500"
				style={{ borderColor: 'rgb(var(--surface))' }}
				aria-hidden="true"
			/>
		) : null}
	</div>
);
