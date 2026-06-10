import { defineConfig, devices } from '@playwright/test';

// Visual-regression: render kty's static harness scenes in a headless,
// software-WebGL (SwiftShader) Chromium and diff against golden PNGs. Goldens
// are generated and run in the official Playwright Linux container (see
// .github/workflows/visual.yml) so the bytes are reproducible across machines —
// they are NOT meant to be regenerated on a developer's local OS/GPU.
const PORT = 5173;

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // Perceptual tolerance: fonts/AA differ slightly even under SwiftShader.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, threshold: 0.2 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Force software WebGL so output is deterministic across machines.
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/tests/visual/index.html?scene=circle`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
