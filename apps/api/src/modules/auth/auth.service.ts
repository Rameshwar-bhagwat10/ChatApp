import type { User } from '@chat-app/types';
import type { LoginPayload, SignupPayload } from './auth.validation';

interface AuthResult {
	token: string;
	user: User;
}

const buildPlaceholderUser = (username: string, email: string): User => {
	const now = new Date().toISOString();

	return {
		id: `user-${username.toLowerCase()}`,
		username,
		email,
		createdAt: now,
		updatedAt: now,
	};
};

export const authService = {
	signup: async (payload: SignupPayload): Promise<AuthResult> => ({
		token: 'phase-1-signup-token',
		user: buildPlaceholderUser(payload.username, payload.email),
	}),

	login: async (payload: LoginPayload): Promise<AuthResult> => ({
		token: 'phase-1-login-token',
		user: buildPlaceholderUser('existing-user', payload.email),
	}),
};
