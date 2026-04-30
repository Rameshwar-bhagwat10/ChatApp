import type { User } from '@chat-app/types';
import { apiClient } from '../../services/api';
import { MOCK_USERS, USE_MOCKS } from '../../lib/constants';
import type { UserDirectory } from './types';

const defaultOnlineUserIds = ['user-2', 'user-3'];

export const getUsers = async (): Promise<User[]> => {
	if (USE_MOCKS) {
		return Promise.resolve(MOCK_USERS);
	}

	const response = await apiClient.get<User[]>('/users');
	return response.data;
};

export const getUserDirectory = async (): Promise<UserDirectory> => {
	const users = await getUsers();

	if (USE_MOCKS) {
		return {
			users,
			onlineUserIds: defaultOnlineUserIds,
		};
	}

	return {
		users,
		onlineUserIds: [],
	};
};
