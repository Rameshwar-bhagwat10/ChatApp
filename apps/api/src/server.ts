import type { User } from '@chat-app/types';
import { logger } from '@chat-app/utils';
import { app } from './app';
import { initializeDatabase } from './config/db';
import { apiConfig } from './config/env';
import { initializeRedis } from './config/redis';

const serviceUser: Pick<User, 'id' | 'username'> = {
	id: 'system',
	username: 'api-service',
};

const bootstrap = async (): Promise<void> => {
	await initializeDatabase();
	await initializeRedis();

	app.listen(apiConfig.port, () => {
		logger.info('API server started', {
			port: apiConfig.port,
			serviceUserId: serviceUser.id,
		});
	});
};

bootstrap().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : 'Unknown startup failure';
	logger.error('Failed to start API server', { message });
	process.exit(1);
});
