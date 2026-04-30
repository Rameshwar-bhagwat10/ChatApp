'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import type {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
} from 'react';
import { Button } from './Button';

interface ModalProps {
	isOpen: boolean;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
	onClose: () => void;
}

export const Modal = ({ isOpen, title, description, children, footer, onClose }: ModalProps) => {
	const titleId = useId();
	const descriptionId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	const getFocusableElements = useCallback(() => {
		if (!dialogRef.current) {
			return [];
		}

		return Array.from(
			dialogRef.current.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			),
		).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
	}, []);

	const onKeyDown = useCallback(
		(event: KeyboardEvent | ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
				return;
			}

			if (event.key !== 'Tab') {
				return;
			}

			const focusableElements = getFocusableElements();

			if (focusableElements.length === 0) {
				event.preventDefault();
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (!firstElement || !lastElement) {
				return;
			}

			const activeElement = document.activeElement;

			if (event.shiftKey && activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			} else if (!event.shiftKey && activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		},
		[getFocusableElements, onClose],
	);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previousActiveElement =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const previousBodyOverflow = document.body.style.overflow;

		document.body.style.overflow = 'hidden';

		const focusableElements = getFocusableElements();
		const firstElement = focusableElements[0] ?? closeButtonRef.current;
		firstElement?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			onKeyDown(event);
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = previousBodyOverflow;
			previousActiveElement?.focus();
		};
	}, [getFocusableElements, isOpen, onKeyDown]);

	if (!isOpen) {
		return null;
	}

	const onOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="bg-theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
			onMouseDown={onOverlayMouseDown}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				className="surface-panel w-full max-w-lg p-6 shadow-2xl"
				onKeyDown={onKeyDown}
			>
				<div className="mb-4 flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h2 id={titleId} className="text-heading">
							{title}
						</h2>
						{description ? (
							<p id={descriptionId} className="text-body text-theme-muted">
								{description}
							</p>
						) : null}
					</div>
					<Button ref={closeButtonRef} variant="ghost" size="sm" aria-label="Close dialog" onClick={onClose}>
						Close
					</Button>
				</div>
				<div>{children}</div>
				{footer ? <div className="mt-6">{footer}</div> : null}
			</div>
		</div>
	);
};
