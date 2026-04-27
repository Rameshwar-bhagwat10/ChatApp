import type { User } from '@chat-app/types';

export const userService = {
	getCurrentUser: async (userId: string): Promise<User> => {
		const now = new Date().toISOString();

		return {
			id: userId,
			username: 'phase-1-user',
			email: 'phase1.user@example.com',
			createdAt: now,
			updatedAt: now,
		};
	},
};
