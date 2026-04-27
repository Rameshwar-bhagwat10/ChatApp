import { loadEnvironment } from '@chat-app/config';

const parsePort = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const sharedEnv = loadEnvironment({
  requiredKeys: ['NEXT_PUBLIC_API_URL'],
});

export const socketConfig = {
  port: parsePort(process.env.SOCKET_PORT, 4001),
  webOrigin: process.env.WEB_ORIGIN?.trim() || 'http://localhost:3000',
  apiUrl: sharedEnv.NEXT_PUBLIC_API_URL,
};
