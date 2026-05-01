import { Router } from 'express';
import {
	adminRevokeUserSessionsController,
	getCurrentUserController,
	loginController,
	listSessionsController,
	logoutController,
	revokeAllSessionsController,
	revokeSessionController,
	refreshController,
	signupController,
} from './auth.controller';
import {
	adminApiKeyMiddleware,
	authMiddleware,
	loginRateLimitMiddleware,
	refreshRateLimitMiddleware,
} from './auth.middleware';

export const authRoutes = Router();

authRoutes.post('/signup', signupController);
authRoutes.post('/login', loginRateLimitMiddleware, loginController);
authRoutes.post('/refresh', refreshRateLimitMiddleware, refreshController);
authRoutes.post('/logout', logoutController);
authRoutes.get('/me', authMiddleware, getCurrentUserController);
authRoutes.get('/sessions', authMiddleware, listSessionsController);
authRoutes.post('/sessions/revoke', authMiddleware, revokeSessionController);
authRoutes.post('/sessions/revoke-all', authMiddleware, revokeAllSessionsController);
authRoutes.post(
	'/admin/users/:userId/sessions/revoke-all',
	adminApiKeyMiddleware,
	adminRevokeUserSessionsController,
);
