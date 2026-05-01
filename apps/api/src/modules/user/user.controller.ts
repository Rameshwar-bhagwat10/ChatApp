import type { RequestHandler } from 'express';
import { userService } from './user.service';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const createUnauthorizedError = (): ErrorWithStatusCode => {
	const error = new Error('Unauthorized') as ErrorWithStatusCode;
	error.statusCode = 401;
	return error;
};

export const getCurrentUserController: RequestHandler = async (request, response, next) => {
	try {
		const authenticatedUser = request.authUser;

		if (!authenticatedUser) {
			throw createUnauthorizedError();
		}

		const user = await userService.getCurrentUser(authenticatedUser.userId);

		response.status(200).json(user);
	} catch (error) {
		next(error);
	}
};
