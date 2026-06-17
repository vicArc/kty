# kty

**ManimGL for the web.** A port of [3Blue1Brown's ManimGL](https://github.com/3b1b/manim) animation engine to the browser — a real-time, interactive math-animation engine built on **modern JavaScript + Three.js + WebGL2**.

Published on npm as **[`@viesar/kty`](https://www.npmjs.com/package/@viesar/kty)**. Live, interactive docs: **[kty.victorarce.com](https://kty.victorarce.com)** (test: [test.kty.victorarce.com](https://test.kty.victorarce.com)).

> **Status:** the library is feature-complete — geometry, text/Tex, coordinate systems, 2D/3D mobjects, vector fields, boolean ops, the full animation system, and web-native export/embedding all render in the browser. Stabilizing toward 1.0; see [`progress.md`](./progress.md) for the stage tracker and [`docs/`](./docs/README.md) for the migration plan.

## Install

```sh
npm install @viesar/kty
```

`three`, `mathjax-full`, and `opentype.js` come along as dependencies. kty ships as plain ESM (`src/`), so any bundler (Vite, webpack, Rollup, esbuild) can consume it.

## Usage

```js
import { ThreeRenderer, Circle, Square, Tex, Axes } from '@viesar/kty';

const canvas = document.querySelector('canvas');
const renderer = new ThreeRenderer({ width: 1280, height: 720 }).attach(canvas);

renderer.render([
  new Circle({ radius: 2, fillColor: '#58C4DD', fillOpacity: 1 }),
  new Square({ sideLength: 2, strokeColor: '#FC6255' }).shift([4, 0, 0]),
  new Tex('e^{i\\pi} + 1 = 0', { color: '#FFFFFF' }).shift([-4, 2, 0]),
]);
```

Animate by stepping an animation's `alpha` in a `requestAnimationFrame` loop (or use `Scene.play`):

```js
import { ThreeRenderer, Square, Circle, Transform, smooth } from '@viesar/kty';

const r = new ThreeRenderer({ width: 1280, height: 720 }).attach(canvas);
const square = new Square({ sideLength: 2.5, fillColor: '#FC6255', fillOpacity: 1 });
const anim = new Transform(
  square,
  new Circle({ radius: 1.6, fillColor: '#58C4DD', fillOpacity: 1 })
);
anim.begin();

let t = 0;
(function frame() {
  t = (t + 0.01) % 1;
  anim.interpolate(smooth(t));
  r.render([square]);
  requestAnimationFrame(frame);
})();
```

### Using Tex (bundler note)

Tex renders via MathJax. Its `version.js` references a `PACKAGE_VERSION` global that breaks in browsers unless defined. With Vite, add to your config:

```js
// vite.config.js
export default {
  define: { PACKAGE_VERSION: JSON.stringify('3.2.1') },
  optimizeDeps: { esbuildOptions: { define: { PACKAGE_VERSION: JSON.stringify('3.2.1') } } },
};
```

(Other bundlers: define `PACKAGE_VERSION` similarly.)

## Documentation

- **[Migration guide](./docs/migration-guide.md)** — porting manim (Python) scenes to kty: the cheatsheet, idiom translations, and gotchas.
- **[API reference](./docs/api-reference.md)** — every exported class, function, and constant, grouped by area.
- **Live showcase & docs site:** **[kty.victorarce.com](https://kty.victorarce.com)** — runnable examples and the official library docs (staging: [test.kty.victorarce.com](https://test.kty.victorarce.com)).

## Develop

```sh
npm install
npm run dev          # dev harness at http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:visual  # visual-regression (Playwright; goldens are generated in CI)
npm run build        # library build (Vite)
npm run lint         # ESLint
```

## Project layout

| Path                                                   | What                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [`docs/migration-guide.md`](./docs/migration-guide.md) | manim → kty porting cheatsheet.                                                                         |
| [`docs/api-reference.md`](./docs/api-reference.md)     | Curated reference of the public API.                                                                    |
| [`docs/`](./docs/README.md)                            | The migration plan (architecture, rendering strategy, staged roadmap, testing).                         |
| [`progress.md`](./progress.md)                         | Live task tracker, mirrors the plan's stages.                                                           |
| `src/`                                                 | Engine source (plain ESM JS). See [`docs/01-target-architecture.md`](./docs/01-target-architecture.md). |
| `tests/unit/`                                          | Vitest unit tests (math, mobjects, animations, …).                                                      |
| `tests/visual/`                                        | Playwright visual-regression harness + scenes; goldens generated in CI (Linux).                         |

## Contributing

The repository is public and MIT-licensed. Direct pushes to `main` are restricted — please **fork and open a pull request**.

## License

[MIT](./LICENSE) © 2026 vicArc
