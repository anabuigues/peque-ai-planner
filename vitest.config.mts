import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts', 'jobs/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            'server-only': r('./apps/web/test/server-only-stub.ts'),
            '@/': r('./apps/web/src/'),
          },
        },
        test: {
          name: 'integration',
          include: ['apps/web/src/**/*.int.test.ts'],
          environment: 'node',
          setupFiles: ['./apps/web/test/integration-setup.ts'],
          testTimeout: 30000,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'rules',
          include: ['firebase/tests/**/*.test.ts'],
          environment: 'node',
          testTimeout: 20000,
        },
      },
    ],
  },
});
