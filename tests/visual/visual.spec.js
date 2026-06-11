import { test, expect } from '@playwright/test';

// Scene ids must match the SCENES map in harness.js. Kept as a literal list so
// this Node-side spec doesn't import the browser-only harness module.
const SCENES = [
  'circle',
  'square',
  'triangle',
  'pentagon',
  'star',
  'squiggle',
  'shapes',
  'axes',
  'plane',
  'tex',
  'text',
  'decimal',
  'sphere',
  'torus',
  'cube',
];

for (const id of SCENES) {
  test(`scene: ${id}`, async ({ page }) => {
    await page.goto(`/tests/visual/index.html?scene=${id}`);
    await page.waitForFunction(() => window.__ktyReady === true || window.__ktyError, null, {
      timeout: 20_000,
    });
    const err = await page.evaluate(() => window.__ktyError);
    expect(err, `scene "${id}" threw`).toBeFalsy();
    // Let a couple of frames render so the canvas is fully drawn.
    await page.waitForTimeout(300);
    await expect(page.locator('#stage')).toHaveScreenshot(`${id}.png`);
  });
}
