import { pino, type Logger } from 'pino';

export type { Logger };

export function createLogger({ level = 'info', pretty = false } = {}): Logger {
  return pino({
    level,
    // Belt and braces: request serializers already drop headers, so cookies never reach the log.
    redact: { paths: ['req.headers.cookie', 'res.headers["set-cookie"]'], remove: true },
    ...(pretty && {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
    }),
  });
}

export const silentLogger = pino({ level: 'silent' });
