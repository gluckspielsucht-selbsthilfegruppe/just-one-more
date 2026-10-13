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
