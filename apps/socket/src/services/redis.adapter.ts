import type { Server } from 'socket.io';
import { logger } from '@chat-app/utils';

export const attachRedisAdapter = async (_io: Server): Promise<void> => {
	logger.info('Socket Redis adapter initialization skipped in Phase 1');
};
