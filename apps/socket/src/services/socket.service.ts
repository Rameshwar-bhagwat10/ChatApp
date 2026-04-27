import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { attachRedisAdapter } from './redis.adapter';

export const createSocketServer = async (
	httpServer: HttpServer,
	webOrigin: string,
): Promise<Server> => {
	const io = new Server(httpServer, {
		cors: {
			origin: [webOrigin],
			methods: ['GET', 'POST'],
		},
	});

	await attachRedisAdapter(io);
	return io;
};
