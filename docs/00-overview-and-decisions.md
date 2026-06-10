# 00 — Overview & Decisions

## Vision

Port ManimGL — the OpenGL-based engine behind 3Blue1Brown's videos — to run **natively in the browser** as a real-time, interactive animation engine. Authors write scenes in TypeScript; the engine renders them live on a canvas via Three.js, with optional export to video.

ManimGL (this is the `3b1b/manim` GL version, **not** ManimCommunity) is the right base because it is already GPU-first: it renders through `moderngl`/OpenGL with GLSL shaders rather than Cairo. The conceptual model (Mobject → Animation → Scene, all GPU-rendered) maps far more naturally to Three.js/WebGL than a CPU-rasterized engine would.

## Source-of-truth facts

- Source: `C:\Projects\manim\manimlib\` — **89 Python files, ~22,964 LOC, 28 GLSL shaders**.
- Target: `C:\Projects\kty\` — empty repo, owned by `vicArc`, default branch `main`.
- ManimGL package version analyzed: `manimgl 1.7.2`.

## The four locked decisions

These were chosen up front and drive the entire plan:

1. **API philosophy → Hybrid.** A faithful core engine (Mobject / VMobject / Scene / Animation semantics preserved 1:1) with a **thin web-native authoring layer** on top. Existing manim scene code ports with light syntax changes; new code can use idiomatic TS (async/await, declarative composition). See [doc 01](./01-target-architecture.md).

2. **Runtime target → Real-time interactive first.** Render live in the browser with Three.js + WebGL2, **adapting Mobjects onto native Three.js objects** wherever possible. Frame-accurate video export (WebCodecs) is a later phase, not the foundation.

3. **Scope → Full 1:1 port.** Every module in `manimlib/` is on the roadmap. Staged so the engine is usable end-to-end early and parity grows over time.

4. **Repo → Public, MIT-licensed, write-protected.** `kty` stays public and open-source under MIT. "Others can't change the code" is achieved the open-source way: non-collaborators can fork and open PRs but cannot push to the repo; only the owner merges, and `main` is protected. See [doc 07](./07-repo-setup-and-lockdown.md).

## Tech stack

| Concern                  | Choice                                                                                                                                                                       | Why                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                 | **Modern JavaScript (ES2023+, ESM)** — no TypeScript                                                                                                                         | Per project direction. Optional **JSDoc** annotations give editor IntelliSense without a type-build step.                                                                                         |
| Build/dev                | **Vite**                                                                                                                                                                     | Fast HMR — directly enables the live-coding workflow that replaces IPython reload. Native ESM, zero-config JS.                                                                                    |
| Rendering                | **Three.js** (`WebGLRenderer`, WebGL2) + its example modules                                                                                                                 | Scene graph, math, FBO/render-target, **and ready-made answers to manim's geometry-shader problem** (`Line2`, `ShapeGeometry`, `SVGLoader`, `ParametricGeometry`). WebGPU backend optional later. |
| Math                     | **Three.js math** (`Vector3`, `Matrix4`, `Quaternion`, `Curve`/`CurvePath`, `QuadraticBezierCurve3`) + custom manim-specific ops                                             | Reuse battle-tested primitives; port only what's manim-specific.                                                                                                                                  |
| Tex                      | **MathJax 3** (SVG output) → path parse → VMobject; KaTeX as a lighter fallback                                                                                              | Browser-native LaTeX; no subprocess.                                                                                                                                                              |
| Text                     | **opentype.js** (glyph outlines → VMobject) primary; **troika-three-text** for fast non-animated labels                                                                      | Outlines preserve manim's fill/stroke/Write animations; Pango isn't portable.                                                                                                                     |
| Boolean path ops         | **paper.js** (or a maintained path-boolean lib)                                                                                                                              | Replaces the `skia-pathops` C++ binding.                                                                                                                                                          |
| Triangulation            | **earcut**                                                                                                                                                                   | Direct replacement for `mapbox_earcut`.                                                                                                                                                           |
| Color                    | **culori** or **colord**                                                                                                                                                     | Replaces `colour` + matplotlib colormaps.                                                                                                                                                         |
| Numerics                 | **ode** / hand-rolled RK4; **bisection** helpers                                                                                                                             | Replaces `scipy.integrate`, `scipy.linalg.solve_banded`.                                                                                                                                          |
| Video export             | **WebCodecs** `VideoEncoder` + `mp4-muxer`; `MediaRecorder` fallback                                                                                                         | Replaces the ffmpeg subprocess pipe.                                                                                                                                                              |
| Unit tests               | **Vitest** (with JUnit XML reporter for CI)                                                                                                                                  | Fast, Vite-integrated, runs plain JS. ("junit" in the brief → unit testing + JUnit-format CI output.)                                                                                             |
| Visual/integration tests | **Playwright** + **pixelmatch**                                                                                                                                              | Render scenes headless, diff against reference PNGs.                                                                                                                                              |
| State/config             | Plain JS module + a small reactive store                                                                                                                                     | Replaces the global mutable `manim_config` addict Dict.                                                                                                                                           |
| Geometry adaptation      | **Native Three.js builders first** (`Shape`, `ShapeGeometry`, `Line2`/`LineGeometry`, `SVGLoader`, `ParametricGeometry`, `Points`), custom shaders only as fidelity fallback | See [doc 02](./02-rendering-strategy.md). Minimizes hand-written GPU code.                                                                                                                        |

## What we deliberately drop or replace (no web equivalent)

| Desktop concern                                        | Web disposition                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `ffmpeg` subprocess                                    | WebCodecs / MediaRecorder                                         |
| LaTeX + `dvisvgm` subprocess                           | MathJax/KaTeX                                                     |
| `manimpango` (Pango) subprocess                        | opentype.js / troika                                              |
| `skia-pathops` C++ binding                             | paper.js / JS path-boolean                                        |
| IPython embed / `reload_scene`                         | Browser live editor + Vite HMR                                    |
| Filesystem dirs, disk cache, `appdirs`                 | URLs / static assets / IndexedDB                                  |
| `module_loader` dynamic import + `__import__` patching | Static scene registry (bundled) or sandboxed eval in the editor   |
| System audio (`subprocess` players)                    | Web Audio API                                                     |
| `argparse` CLI                                         | URL params + settings UI (CLI kept only for the Node export tool) |

## Non-goals (at least initially)

- Bit-for-bit pixel parity with desktop manim. Anti-aliasing, font rasterization, and LaTeX glyph outlines will differ. We target _perceptual_ parity, verified by visual-regression thresholds.
- Server-side rendering. The first-class target is the browser. A headless Node export path is a later add-on.
- Backwards-compatibility with 3b1b's `videos` repo scene code verbatim.
