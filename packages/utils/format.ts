export const formatIsoDate = (isoTimestamp: string): string => {
	const date = new Date(isoTimestamp);

	if (Number.isNaN(date.getTime())) {
		return 'Invalid date';
	}

	return date.toISOString();
};

export const truncateText = (value: string, maxLength: number): string => {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength)}...`;
};
