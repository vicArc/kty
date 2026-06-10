import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // JUnit XML for CI dashboards (the "junit" requirement), plus readable console output.
    reporters: process.env.CI
      ? ['default', ['junit', { outputFile: './reports/junit/unit.xml' }]]
      : ['default'],
  },
});
