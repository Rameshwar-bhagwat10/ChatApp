import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getCurrentUserController } from './user.controller';

export const userRoutes = Router();

userRoutes.get('/me', authMiddleware, getCurrentUserController);
