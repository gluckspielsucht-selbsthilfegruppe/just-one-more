import { resolve } from 'node:path';

export type TrustProxy = boolean | number | string;

export interface ServerConfig {
  port: number;
  databaseFile: string;
  trustProxy: TrustProxy;
  cookieSecure?: boolean;
}

// Same values Express accepts for `trust proxy`: false, true, a hop count, or addresses/subnets.
export function parseTrustProxy(value?: string): TrustProxy {
  const setting = value?.trim();
  if (!setting || setting === 'false') return false;
  if (setting === 'true') return true;
  if (/^\d+$/.test(setting)) return Number(setting);
  return setting;
}

export function parseCookieSecure(value?: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(env.PORT ?? 3000),
    databaseFile: resolve(env.DATA_DIR ?? 'data', 'just-one-more.db'),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    cookieSecure: parseCookieSecure(env.COOKIE_SECURE),
  };
}
