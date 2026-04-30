import type { User } from '@chat-app/types';
import { create } from 'zustand';

interface UserHydrationPayload {
	users: User[];
	onlineUserIds: string[];
}

interface UserStore {
	users: User[];
	onlineUserIds: string[];
	isLoading: boolean;
	isHydrated: boolean;
	setLoading: (isLoading: boolean) => void;
	hydrateUsers: (payload: UserHydrationPayload) => void;
	setOnlineUsers: (userIds: string[]) => void;
	updatePresence: (userId: string, isOnline: boolean) => void;
}

const uniqueUserIds = (userIds: string[]) => Array.from(new Set(userIds));

export const useUserStore = create<UserStore>((set) => ({
	users: [],
	onlineUserIds: [],
	isLoading: false,
	isHydrated: false,
	setLoading: (isLoading) => set({ isLoading }),
	hydrateUsers: ({ users, onlineUserIds }) =>
		set({
			users,
			onlineUserIds: uniqueUserIds(onlineUserIds),
			isHydrated: true,
			isLoading: false,
		}),
	setOnlineUsers: (userIds) => set({ onlineUserIds: uniqueUserIds(userIds) }),
	updatePresence: (userId, isOnline) =>
		set((state) => {
			const onlineUserSet = new Set(state.onlineUserIds);

			if (isOnline) {
				onlineUserSet.add(userId);
			} else {
				onlineUserSet.delete(userId);
			}

			return {
				onlineUserIds: Array.from(onlineUserSet),
			};
		}),
}));
