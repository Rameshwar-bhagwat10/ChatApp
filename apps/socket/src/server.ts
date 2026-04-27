import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '@chat-app/utils';
import { socketConfig } from './config/env';
import { handleSocketConnection } from './handlers/connection.handler';
import { createSocketServer } from './services/socket.service';

const requestHandler = (request: IncomingMessage, response: ServerResponse): void => {
	if (request.url === '/health') {
		response.statusCode = 200;
		response.end('Socket server is running');
		return;
	}

	response.statusCode = 404;
	response.end('Not Found');
};

const httpServer = createServer(requestHandler);

const bootstrap = async (): Promise<void> => {
	const io = await createSocketServer(httpServer, socketConfig.webOrigin);

	io.on('connection', handleSocketConnection);

	httpServer.listen(socketConfig.port, () => {
		logger.info('Socket server started', { port: socketConfig.port });
	});
};

bootstrap().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : 'Unknown socket startup failure';
	logger.error('Failed to start socket server', { message });
	process.exit(1);
});
