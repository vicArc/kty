# kty

**ManimGL for the web.** A port of [3Blue1Brown's ManimGL](https://github.com/3b1b/manim) animation engine to the browser — a real-time, interactive math-animation engine built on **modern JavaScript + Three.js + WebGL2**.

> **Status:** Stage 0 (scaffold). The full migration plan lives in [`docs/`](./docs/README.md); progress is tracked in [`progress.md`](./progress.md).

## Quick start

```sh
npm install
npm run dev      # dev harness at http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # library build (Vite)
npm run lint     # ESLint
```

## Project layout

| Path                           | What                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [`docs/`](./docs/README.md)    | The migration plan (architecture, rendering strategy, staged roadmap, testing).                         |
| [`progress.md`](./progress.md) | Live task tracker, mirrors the plan's stages.                                                           |
| `src/`                         | Engine source (plain ESM JS). See [`docs/01-target-architecture.md`](./docs/01-target-architecture.md). |
| `tests/`                       | `unit/`, `parity/`, `visual/`, `fixtures/`.                                                             |
| `reference/`                   | Golden PNGs from desktop manim for visual-regression parity.                                            |

## Contributing

The repository is public and MIT-licensed. Direct pushes to `main` are restricted — please **fork and open a pull request**.

## License

[MIT](./LICENSE) © 2026 vicArc
