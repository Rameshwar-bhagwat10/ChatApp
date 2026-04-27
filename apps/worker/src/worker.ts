import { logger } from '@chat-app/utils';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { workerConfig } from './config/env';
import { createMessageProcessor } from './jobs/message.processor';
import { processNotificationPlaceholder } from './jobs/notification.processor';
import { MESSAGE_QUEUE_NAME, type MessageJobPayload } from './queues/message.queue';
import { MessageService } from './services/message.service';

let redisConnection: IORedis | null = null;
let worker: Worker<MessageJobPayload> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const clearReconnectTimer = (): void => {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
};

const scheduleReconnect = (): void => {
	if (reconnectTimer) {
		return;
	}

	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		void bootstrapWorker();
	}, workerConfig.reconnectDelayMs);
};

const bootstrapWorker = async (): Promise<void> => {
	if (worker) {
		return;
	}

	clearReconnectTimer();

	const connection = new IORedis(workerConfig.redisUrl, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
		lazyConnect: true,
	});

	connection.on('error', () => {
		return;
	});

	try {
		await connection.connect();

		redisConnection = connection;

		const messageService = new MessageService();
		const processor = createMessageProcessor(messageService);

		worker = new Worker<MessageJobPayload>(MESSAGE_QUEUE_NAME, processor, {
			connection,
		});

		await processNotificationPlaceholder();
		logger.info('Worker is running');

		worker.on('error', (error) => {
			logger.error('Worker error', { message: error.message });
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown Redis connection failure';

		logger.warn('Worker running in standby mode while Redis is unavailable', { message });

		await connection.quit().catch(() => {
			return;
		});

		scheduleReconnect();
	}
};

const shutdown = async (): Promise<void> => {
	clearReconnectTimer();

	if (worker) {
		await worker.close();
		worker = null;
	}

	if (redisConnection) {
		await redisConnection.quit();
		redisConnection = null;
	}

	process.exit(0);
};

process.on('SIGINT', () => {
	void shutdown();
});

process.on('SIGTERM', () => {
	void shutdown();
});

void bootstrapWorker();
