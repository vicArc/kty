# 06 — Testing Strategy

> The brief asked for "junit." We interpret that as **unit testing** with **JUnit-format XML output for CI** (consumable by GitHub Actions and most dashboards). Stack: **Vitest** for unit, **Playwright + pixelmatch** for visual/integration, and a **parity** layer that diffs against the Python original.

Three layers, each catching a different class of bug:

```
        ┌─────────────────────────────────────────────┐
  few   │ Visual regression  (Playwright + pixelmatch) │  "does it look like manim?"
        ├─────────────────────────────────────────────┤
  some  │ Parity / golden    (Vitest + Python fixtures)│  "do the numbers match manim?"
        ├─────────────────────────────────────────────┤
  many  │ Unit               (Vitest)                  │  "is each function correct?"
        └─────────────────────────────────────────────┘
```

## 1. Unit tests (Vitest) — the foundation

Pure-logic modules (Stage 1–2, most of Stage 6) are tested in isolation. These should be the **bulk** of tests and run in milliseconds.

- Math: `bezier`, `space_ops`, `rate_functions`, `paths`, `color`, `iterables`, `simple_functions`.
- Data: `MobjectData` resize/interp/slice; family-tree ops; transforms; bounding box.
- Animation logic: `interpolate(alpha)` outputs for sampled alphas; lag/rate math; composition timing.

JUnit output for CI:

```js
// vitest.config.js
export default {
  test: {
    environment: 'node',
    reporters: ['default', ['junit', { outputFile: './reports/junit/unit.xml' }]],
    coverage: { reporter: ['text', 'lcov'] },
  },
};
```

## 2. Parity / golden tests — "match the Python"

The strongest correctness signal for a port: feed **identical inputs** to ManimGL (Python) and kty (JS) and assert the **numeric** results agree within tolerance. This catches silent divergence that unit tests written from scratch would miss.

- **Fixture generator** (one-time, in `C:\Projects\manim`): a small Python script imports `manimlib`, runs chosen functions/objects, and dumps inputs+outputs to JSON (e.g. bezier sample points, a transformed mobject's `point`/`rgba` columns, an animation's state at `alpha ∈ {0,.25,.5,.75,1}`, c2p/p2c grids).
- **JS side**: load the JSON, run the kty equivalent, assert `closeTo` within tolerance (e.g. `1e-5` for math, looser for anything touching fonts).
- Store fixtures in `tests/fixtures/`; regenerate when intentionally diverging.
- This is how Stage 1.9, 2.7, 5.10, 6.7 "vs Python fixtures" tasks are implemented.

## 3. Visual regression — "look like manim"

The only way to validate the renderer (Stage 3–7), where numeric parity is impossible (AA, fonts, triangulation differ).

- **Reference images**: render a curated scene set in **desktop ManimGL** at a fixed resolution → `reference/*.png` (golden masters, committed via Git LFS).
- **Candidate images**: Playwright loads the kty scene in a headless WebGL2 browser, renders the same frame(s), screenshots the canvas.
- **Diff**: `pixelmatch` with a **perceptual threshold** (e.g. ≤1–2% mismatched pixels, anti-alias-tolerant). Fail the test and emit a side-by-side diff PNG on regression.
- **The Stage 3 gate** (S3.8/S3.10) is exactly this: circle, concave star, Bézier squiggle, one Tex must pass before Stage 4+ proceed.
- Keep a **parity scoreboard** (Stage 10): % of ported `example_scenes.py` scenes within threshold.

```js
// tests/visual/circle.spec.js (Playwright)
import { test, expect } from '@playwright/test';
test('filled+stroked circle matches manim', async ({ page }) => {
  await page.goto('/test-harness?scene=CircleSpike');
  await page.waitForFunction(() => window.kty?.rendered === true);
  const shot = await page.locator('canvas').screenshot();
  expect(shot).toMatchSnapshot('circle.png', { maxDiffPixelRatio: 0.02 });
});
```

Playwright also emits JUnit (`reporter: [['junit', { outputFile: 'reports/junit/visual.xml' }]]`).

## CI (GitHub Actions)

On every PR to `main` (which is required by branch protection — [doc 07](./07-repo-setup-and-lockdown.md)):

1. `npm ci`
2. `eslint` + `prettier --check`
3. `vitest run` → `reports/junit/unit.xml` (+ coverage)
4. `vite build` (must succeed; bundle-size budget check)
5. `playwright test` (visual/parity) → `reports/junit/visual.xml` + diff artifacts on failure
6. Publish JUnit XML to the checks UI; upload diff images as artifacts.

Visual tests run on a pinned browser build for stable AA; reference images are regenerated deliberately, never auto-updated in CI.

## What to test per stage (summary)

| Stage                   | Primary test type                                               |
| ----------------------- | --------------------------------------------------------------- |
| S1, S2, S6 (pure logic) | Unit + parity fixtures                                          |
| S3 (renderer)           | Visual regression (the gate)                                    |
| S4 (shapes)             | Visual regression per shape                                     |
| S5 (animation)          | Parity (alpha states) + visual (canonical scenes)               |
| S7 (text/Tex)           | Visual, perceptual threshold (fonts differ)                     |
| S8 (interactivity)      | Playwright interaction tests (click/drag/raycast)               |
| S9 (export)             | Decode exported MP4, assert frame count/dimensions/checksum-ish |
| S10 (parity sweep)      | Scoreboard over `example_scenes.py`                             |
