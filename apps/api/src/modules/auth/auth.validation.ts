export interface SignupPayload {
	username: string;
	email: string;
	password: string;
}

export interface LoginPayload {
	email: string;
	password: string;
}

const asRecord = (value: unknown): Record<string, unknown> => {
	if (!value || typeof value !== 'object') {
		throw new Error('Invalid payload');
	}

	return value as Record<string, unknown>;
};

const asNonEmptyString = (value: unknown, fieldName: string): string => {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`Invalid ${fieldName}`);
	}

	return value.trim();
};

export const parseSignupPayload = (payload: unknown): SignupPayload => {
	const record = asRecord(payload);

	return {
		username: asNonEmptyString(record.username, 'username'),
		email: asNonEmptyString(record.email, 'email'),
		password: asNonEmptyString(record.password, 'password'),
	};
};

export const parseLoginPayload = (payload: unknown): LoginPayload => {
	const record = asRecord(payload);

	return {
		email: asNonEmptyString(record.email, 'email'),
		password: asNonEmptyString(record.password, 'password'),
	};
};
