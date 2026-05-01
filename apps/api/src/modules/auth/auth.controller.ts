import type { RequestHandler } from 'express';
import { authService } from './auth.service';
import {
	parseLoginPayload,
	parseRefreshTokenPayload,
	parseSessionRevokePayload,
	parseSignupPayload,
	parseUserPathParams,
} from './auth.validation';

const extractRequestContext = (request: Parameters<RequestHandler>[0]) => ({
	userAgent: request.get('user-agent')?.trim() || null,
	ipAddress: request.ip || request.socket.remoteAddress || null,
});

export const signupController: RequestHandler = async (request, response, next) => {
	try {
		const payload = parseSignupPayload(request.body);
		const result = await authService.signup(payload);

		response.status(201).json(result);
	} catch (error) {
		next(error);
	}
};

export const loginController: RequestHandler = async (request, response, next) => {
	try {
		const payload = parseLoginPayload(request.body);
		const result = await authService.login(payload, extractRequestContext(request));

		response.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const refreshController: RequestHandler = async (request, response, next) => {
	try {
		const payload = parseRefreshTokenPayload(request.body);
		const result = await authService.refreshAccessToken(
			payload.refreshToken,
			extractRequestContext(request),
		);

		response.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const logoutController: RequestHandler = async (request, response, next) => {
	try {
		const payload = parseRefreshTokenPayload(request.body);
		await authService.logout(payload.refreshToken);

		response.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createUnauthorizedError = (): ErrorWithStatusCode => {
	const error = new Error('Unauthorized') as ErrorWithStatusCode;
	error.statusCode = 401;
	return error;
};

const createForbiddenError = (): ErrorWithStatusCode => {
	const error = new Error('Forbidden') as ErrorWithStatusCode;
	error.statusCode = 403;
	return error;
};

const getRequiredAuthenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
	const authenticatedUser = request.authUser;

	if (!authenticatedUser) {
		throw createUnauthorizedError();
	}

	return authenticatedUser.userId;
};

export const getCurrentUserController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getRequiredAuthenticatedUserId(request);
		const user = await authService.getCurrentUser(userId);
		response.status(200).json(user);
	} catch (error) {
		next(error);
	}
};

export const listSessionsController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getRequiredAuthenticatedUserId(request);
		const sessions = await authService.listSessions(userId);

		response.status(200).json({ sessions });
	} catch (error) {
		next(error);
	}
};

export const revokeSessionController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getRequiredAuthenticatedUserId(request);
		const payload = parseSessionRevokePayload(request.body);
		await authService.revokeSession(userId, payload.sessionId);

		response.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

export const revokeAllSessionsController: RequestHandler = async (request, response, next) => {
	try {
		const userId = getRequiredAuthenticatedUserId(request);
		await authService.revokeAllSessions(userId);

		response.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

export const adminRevokeUserSessionsController: RequestHandler = async (request, response, next) => {
	try {
		const params = parseUserPathParams(request.params);
		const adminContext = request.authAdmin;

		if (!adminContext) {
			throw createForbiddenError();
		}

		await authService.adminRevokeUserSessions(params.userId, adminContext);

		response.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};
