import { defineConfig } from 'vitest/config';
import path from 'path';

// Get the directory containing this config file
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: __dirname, // Absolute path to this directory
    include: ['src/__tests__/**/*.test.ts', 'src/__integration__/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/', 'dashboard/', '..', '../'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 10000, // 10 second timeout per test
    hookTimeout: 10000, // 10 second timeout for hooks
    teardownTimeout: 10000, // 10 second timeout for teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        perFile: false
      },
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dashboard/',
        'vitest.config.ts',
        'templates/**/*',
        'prompts/**/*'
      ]
    },
    // Add pool options to prevent hanging
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
