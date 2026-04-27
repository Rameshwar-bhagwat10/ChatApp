import type { Job } from 'bullmq';
import { logger } from '@chat-app/utils';
import type { MessageJobPayload } from '../queues/message.queue';
import type { MessageService } from '../services/message.service';

export const createMessageProcessor =
	(messageService: MessageService) =>
	async (job: Job<MessageJobPayload>): Promise<void> => {
		const persistedMessage = await messageService.persistMessage(job.data);

		logger.info('Processed message job', {
			jobId: String(job.id ?? 'unknown'),
			chatId: persistedMessage.chatId,
		});
	};
