import type { RequestHandler } from 'express';
import { mediaService } from './media.service';

export const uploadMediaController: RequestHandler = async (_request, response, next) => {
	try {
		const result = await mediaService.upload();

		response.status(202).json(result);
	} catch (error) {
		next(error);
	}
};
