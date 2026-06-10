# kty — ManimGL → Web (TypeScript + Three.js) Migration

**kty** is a port of [3Blue1Brown's ManimGL](https://github.com/3b1b/manim) animation engine to the browser, built on **modern JavaScript (ES2023+) + Three.js + WebGL2** (with an optional WebGPU path). The goal is a real-time, interactive math-animation engine that runs natively on the web.

> **Language:** plain modern JavaScript (ESM, ES2023+) — **no TypeScript**. Optional JSDoc annotations are used purely for editor IntelliSense; they are comments, never a build step.
>
> **Adaptation principle:** wherever manim builds geometry by hand on the GPU, **adapt the Mobject onto a native Three.js object instead** (`Line2`/`LineMaterial`, `THREE.Shape`/`ShapeGeometry`, `SVGLoader`, `ParametricGeometry`, `Points`, `QuadraticBezierCurve3`). We reimplement manim's custom shaders only where native Three.js can't reach the required fidelity.

This `docs/` folder is the **migration plan**. Read the documents in order.

| #   | Document                                                 | What it covers                                                    |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 00  | [Overview & Decisions](./00-overview-and-decisions.md)   | Vision, scope, the four locked decisions, tech-stack choices      |
| 01  | [Target Architecture](./01-target-architecture.md)       | How manim concepts map to TS/Three.js; layering; data model       |
| 02  | [Rendering Strategy](./02-rendering-strategy.md)         | The geometry-shader blocker and the chosen solution (deep dive)   |
| 03  | [Module Analysis](./03-module-analysis.md)               | Per-module inventory of all ~89 source files with risk ratings    |
| 04  | [Migration Stages](./04-migration-stages.md)             | The staged roadmap — every stage broken into concrete tasks       |
| 05  | [Web Improvements](./05-web-improvements.md)             | Things we do _better_ than desktop manim because we're on the web |
| 06  | [Testing Strategy](./06-testing-strategy.md)             | Unit, parity, and visual-regression testing (Vitest + Playwright) |
| 07  | [Repo Setup & Lockdown](./07-repo-setup-and-lockdown.md) | Scaffold, CI, and locking the GitHub repo so others can't merge   |

**Progress tracking** lives in [`../progress.md`](../progress.md) — update it as tasks complete.

## TL;DR

- **Source**: ManimGL `manimlib/` — ~89 Python files, ~23k LOC, 28 GLSL shaders.
- **Strategy**: Full 1:1 port, staged. Hybrid API (faithful core engine + thin web-native authoring layer). Real-time interactive first; video export second.
- **The hard parts** (in priority order):
  1. **VMobject stroke/fill rendering** — manim does it with GPU _geometry shaders_, which **WebGL2 does not have**. The plan adapts these onto Three.js's native fat-line (`Line2`) and shape-fill (`ShapeGeometry`/`SVGLoader`) facilities, with custom shaders only as a fidelity fallback. See [doc 02](./02-rendering-strategy.md).
  2. **Tex** (LaTeX subprocess → MathJax) and **Text** (Pango subprocess → opentype.js/troika).
  3. **Boolean path ops** (skia-pathops → paper.js / native).
  4. The numpy structured-array **data model** → typed-array column store.
  5. **Live-coding loop** (IPython embed/reload → in-browser editor + hot reload).
- **Everything else** (math, geometry, animations, coordinate systems, value trackers) is a mostly-mechanical port of pure logic — the bulk of the LOC, the minority of the risk.
