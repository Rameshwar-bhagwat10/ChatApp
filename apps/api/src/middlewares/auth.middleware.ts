import type { RequestHandler } from 'express';

export const authMiddleware: RequestHandler = (request, response, next) => {
	const authorizationHeader = request.headers.authorization;

	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		response.status(401).json({ message: 'Unauthorized' });
		return;
	}

	next();
};
