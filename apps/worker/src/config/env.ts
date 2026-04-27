import { loadEnvironment } from '@chat-app/config';

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const sharedEnv = loadEnvironment({
  requiredKeys: ['REDIS_URL'],
});

export const workerConfig = {
  redisUrl: sharedEnv.REDIS_URL,
  reconnectDelayMs: parsePositiveInt(process.env.WORKER_RECONNECT_DELAY_MS, 5000),
};
