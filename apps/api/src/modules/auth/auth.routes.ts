import { Router } from 'express';
import { loginController, signupController } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/signup', signupController);
authRoutes.post('/login', loginController);
