export const isNonEmptyString = (value: string): boolean => value.trim().length > 0;

export const isValidEmail = (value: string): boolean =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
