import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: { host: '0.0.0.0' },
  build: isSsrBuild
    ? { outDir: 'dist/server', copyPublicDir: false, target: 'node22' }
    : { outDir: 'dist/client' },
  test: {
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Process entry points are exercised by the e2e suite and the Docker smoke test.
      exclude: [
        'src/client/main.tsx',
        'src/server/dev.ts',
        'src/server/index.ts',
        'src/server/serve.ts',
      ],
      reporter: ['text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 50,
        statements: 50,
        functions: 35,
        branches: 40,
        'src/shared/**': { lines: 95, statements: 95, functions: 100, branches: 90 },
        'src/server/**': { lines: 85, statements: 80, functions: 85, branches: 75 },
      },
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'client',
          include: ['tests/client/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['tests/client/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
}));
