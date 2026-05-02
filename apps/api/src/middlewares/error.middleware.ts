import type { ErrorRequestHandler } from 'express';
import { logger } from '@chat-app/utils';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

const hasStatusCode = (error: unknown): error is ErrorWithStatusCode => {
	if (!(error instanceof Error)) {
		return false;
	}

	const statusCode = (error as { statusCode?: unknown }).statusCode;
	return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600;
};

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
	const statusCode = hasStatusCode(error) ? error.statusCode : 500;
	const message = error instanceof Error ? error.message : 'Unexpected server error';
	const sanitizedMessage = statusCode >= 500 ? 'Internal server error' : message;

	logger.error('Unhandled API error', { message, statusCode });
	response.status(statusCode).json({
		success: false,
		error: {
			message: sanitizedMessage,
		},
		message: sanitizedMessage,
	});
};
