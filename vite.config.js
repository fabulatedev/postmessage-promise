import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            name: 'chrome', // browser name is required
        },
        coverage: {
            enabled: true,
            include: ['src/**/*.ts'],
            provider: 'istanbul',
        },
    }
  })