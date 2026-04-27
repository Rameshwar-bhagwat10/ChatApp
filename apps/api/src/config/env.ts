import { loadEnvironment } from '@chat-app/config';

const toPort = (rawPort: string | undefined, fallback: number): number => {
	const parsedPort = Number(rawPort);

	if (Number.isNaN(parsedPort) || parsedPort <= 0) {
		return fallback;
	}

	return parsedPort;
};

const sharedEnv = loadEnvironment({
	requiredKeys: ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'NEXT_PUBLIC_API_URL'],
});

export const apiConfig = {
	...sharedEnv,
	port: toPort(process.env.API_PORT, 4000),
};
