type LogMeta = Record<string, string | number | boolean>;

const now = (): string => new Date().toISOString();

const writeLog = (level: string, message: string, meta?: LogMeta): void => {
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${now()}] [${level}] ${message}${payload}`);
};

export const logger = {
  info: (message: string, meta?: LogMeta): void => writeLog('INFO', message, meta),
  warn: (message: string, meta?: LogMeta): void => writeLog('WARN', message, meta),
  error: (message: string, meta?: LogMeta): void => writeLog('ERROR', message, meta),
};
