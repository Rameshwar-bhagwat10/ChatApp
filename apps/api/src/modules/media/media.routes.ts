import { Router } from 'express';
import { uploadMediaController } from './media.controller';

export const mediaRoutes = Router();

mediaRoutes.post('/upload', uploadMediaController);
