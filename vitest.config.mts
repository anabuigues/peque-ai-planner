import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts', 'jobs/src/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
          environment: 'node',
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
