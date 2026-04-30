import type { User } from '@chat-app/types';

export interface UserDirectory {
	users: User[];
	onlineUserIds: string[];
}
