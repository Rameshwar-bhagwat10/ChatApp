import type { ErrorRequestHandler } from 'express';
import { logger } from '@chat-app/utils';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
	const message = error instanceof Error ? error.message : 'Unexpected server error';

	logger.error('Unhandled API error', { message });
	response.status(500).json({ message: 'Internal server error' });
};
