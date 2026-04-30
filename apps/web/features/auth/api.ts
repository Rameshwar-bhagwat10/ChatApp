import { apiClient } from '../../services/api';
import { CURRENT_USER_ID, USE_MOCKS } from '../../lib/constants';
import type { AuthSession, LoginPayload, SignupPayload } from './types';

const buildMockSession = (): AuthSession => ({
	userId: CURRENT_USER_ID,
	token: 'mock-session-token',
	expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

export const login = async (_payload: LoginPayload): Promise<AuthSession> => {
	if (USE_MOCKS) {
		return Promise.resolve(buildMockSession());
	}

	const response = await apiClient.post<AuthSession>('/auth/login', _payload);
	return response.data;
};

export const signup = async (_payload: SignupPayload): Promise<AuthSession> => {
	if (USE_MOCKS) {
		return Promise.resolve(buildMockSession());
	}

	const response = await apiClient.post<AuthSession>('/auth/signup', _payload);
	return response.data;
};
