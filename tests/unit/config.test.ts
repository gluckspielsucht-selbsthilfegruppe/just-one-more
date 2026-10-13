import { describe, expect, it } from 'vitest';
import { parseCookieSecure, parseTrustProxy, readConfig } from '../../src/server/config';

describe('server configuration', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['true', true],
    ['1', 1],
    ['loopback', 'loopback'],
    ['uniquelocal, 10.0.0.1', 'uniquelocal, 10.0.0.1'],
  ])('parses TRUST_PROXY=%j', (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });

  it.each([
    [undefined, undefined],
    ['', undefined],
    ['true', true],
    ['false', false],
  ])('parses COOKIE_SECURE=%j', (value, expected) => {
    expect(parseCookieSecure(value)).toBe(expected);
  });

  it('reads defaults and overrides from the environment', () => {
    expect(readConfig({})).toMatchObject({
      port: 3000,
      trustProxy: false,
      logLevel: 'info',
      metricsPort: undefined,
      metricsHost: '127.0.0.1',
    });
    expect(readConfig({}).databaseFile).toMatch(/data[/\\]just-one-more\.db$/);
    expect(
      readConfig({
        PORT: '8080',
        DATA_DIR: '/tmp/x',
        TRUST_PROXY: '1',
        COOKIE_SECURE: 'true',
        LOG_LEVEL: 'debug',
        METRICS_PORT: '9100',
        METRICS_HOST: '0.0.0.0',
      }),
    ).toEqual({
      port: 8080,
      databaseFile: '/tmp/x/just-one-more.db',
      trustProxy: 1,
      cookieSecure: true,
      logLevel: 'debug',
      metricsPort: 9100,
      metricsHost: '0.0.0.0',
    });
  });
});
