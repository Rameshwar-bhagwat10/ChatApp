import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotEnv } from 'dotenv';

export interface SharedEnv {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  NEXT_PUBLIC_API_URL: string;
}

export type SharedEnvKey = keyof SharedEnv;

interface LoadEnvironmentOptions {
  cwd?: string;
  requiredKeys?: SharedEnvKey[];
}

const defaultEnvValues: Record<SharedEnvKey, string> = {
  DATABASE_URL: '',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_SECRET: '',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
};

let environmentLoaded = false;

const envCandidates = (cwd: string): string[] => [
  path.resolve(cwd, '.env'),
  path.resolve(cwd, '../../.env'),
  path.resolve(cwd, '../../../.env'),
];

const normalizeValue = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized;
};

const assertRequiredKeys = (env: SharedEnv, requiredKeys: SharedEnvKey[]): void => {
  const missingKeys = requiredKeys.filter((key) => env[key].trim().length === 0);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }
};

export const loadEnvironment = (options: LoadEnvironmentOptions = {}): SharedEnv => {
  const cwd = options.cwd ?? process.cwd();

  if (!environmentLoaded) {
    for (const envPath of envCandidates(cwd)) {
      if (existsSync(envPath)) {
        loadDotEnv({ path: envPath, override: false });
        break;
      }
    }

    environmentLoaded = true;
  }

  const env: SharedEnv = {
    DATABASE_URL: normalizeValue(process.env.DATABASE_URL, defaultEnvValues.DATABASE_URL),
    REDIS_URL: normalizeValue(process.env.REDIS_URL, defaultEnvValues.REDIS_URL),
    JWT_SECRET: normalizeValue(process.env.JWT_SECRET, defaultEnvValues.JWT_SECRET),
    NEXT_PUBLIC_API_URL: normalizeValue(
      process.env.NEXT_PUBLIC_API_URL,
      defaultEnvValues.NEXT_PUBLIC_API_URL,
    ),
  };

  if (options.requiredKeys && options.requiredKeys.length > 0) {
    assertRequiredKeys(env, options.requiredKeys);
  }

  return env;
};
