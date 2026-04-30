export const cn = (...values: Array<string | false | null | undefined>) =>
	values.filter((value): value is string => Boolean(value)).join(' ');

export const formatTimestamp = (dateValue: string) =>
	new Intl.DateTimeFormat('en', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(dateValue));

export const formatDateLabel = (dateValue: string) =>
	new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
	}).format(new Date(dateValue));
