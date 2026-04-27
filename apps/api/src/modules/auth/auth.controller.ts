import type { RequestHandler } from 'express';
import { authService } from './auth.service';
import { parseLoginPayload, parseSignupPayload } from './auth.validation';

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
		const result = await authService.login(payload);

		response.status(200).json(result);
	} catch (error) {
		next(error);
	}
};
