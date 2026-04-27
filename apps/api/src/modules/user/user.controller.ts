import type { RequestHandler } from 'express';
import { userService } from './user.service';

export const getCurrentUserController: RequestHandler = async (request, response, next) => {
	try {
		const authorizationHeader = request.headers.authorization;
		const token = authorizationHeader?.replace('Bearer ', '').trim() || 'phase-1-user';
		const user = await userService.getCurrentUser(token);

		response.status(200).json(user);
	} catch (error) {
		next(error);
	}
};
