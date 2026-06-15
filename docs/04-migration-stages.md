# 04 — Migration Stages

Staged roadmap for the full 1:1 port. Stages are ordered so the **~12 hard files gate early** and the ~75 low-risk files parallelize behind them. Each task has a stable ID (`S<stage>.<n>`) used by [`../progress.md`](../progress.md).

**Sequencing principle:** nothing depends on the VMobject renderer until it has passed the Stage 3 visual-parity spike. Build the risky core first; pile volume on later.

**Library scope (kty vs kty-doc).** kty is a **lean rendering/animation library** — mobjects, animations, coordinate systems, a thin events/picking API, embeddability, and frame/image/SVG export. The **application-shaped** pieces inherited from ManimGL-the-_tool_ — the on-screen authoring editor, live-coding HMR, and video/audio assembly — live in **kty-doc** (the playground & showcase app that consumes the published package), **not** in the core bundle or as extra npm packages. The second authoring DSL and the CLI scene-registry are **dropped**: the JS API _is_ the authoring surface; a library consumer imports and calls directly. This keeps the library small and focused; the "tool" experience is an app built on top of it.

---

## Stage 0 — Repo & tooling foundation

_Goal: a buildable, tested, locked-down empty project._ Details in [doc 07](./07-repo-setup-and-lockdown.md).

- **S0.1** `npm init`; ESM (`"type": "module"`); add `three`, `vite`, `vitest`, `@playwright/test`, `pixelmatch`, `eslint`, `prettier`.
- **S0.2** Vite config (dev server + HMR + lib build); folder scaffold from [doc 01](./01-target-architecture.md).
- **S0.3** ESLint (flat config) + Prettier; optional `jsconfig.json` with `checkJs` for JSDoc hints.
- **S0.4** Vitest config with JUnit XML reporter; one smoke test green.
- **S0.5** GitHub Actions CI (lint + unit + build) — see [doc 06](./06-testing-strategy.md).
- **S0.6** **Repo write-protection** (stays public, MIT): add `LICENSE`; protect `main` (PRs required, no direct pushes); don't add collaborators — [doc 07](./07-repo-setup-and-lockdown.md).
- **S0.7** First commit + push; verify CI + protection active.

## Stage 1 — Foundation (math, color, config, constants)

_Goal: the pure-logic substrate everything imports. All unit-tested against the Python._

- **S1.1** `constants` — directions, angles, frame geometry, color palette.
- **S1.2** `config` module + reactive store; load defaults JSON; merge user overrides.
- **S1.3** `color` — conversions, gradients, colormaps (`culori`/`colord`).
- **S1.4** `iterables`, `dict_ops`, `simple_functions`, `family_ops` helpers.
- **S1.5** `space_ops` — vectors/rotations/intersections (`Vector3`/`Quaternion`) + `earcut` triangulation.
- **S1.6** `bezier` — eval, partial curves, smooth handles, cubic→quad, banded solver.
- **S1.7** `rate_functions` + `paths`.
- **S1.8** Array-helper module (lerp/resize/strided ops) backing the data store.
- **S1.9** Unit tests: feed identical inputs to Python and JS, assert numeric parity (golden fixtures).

## Stage 2 — Mobject core & data model

_Goal: the base object, hierarchy, transforms, updaters — renderer-agnostic._

- **S2.1** `MobjectData` SoA column store (resize/interp/slice ops).
- **S2.2** `Mobject` base — submobjects/family, add/remove, copy/clone.
- **S2.3** Transforms — shift/scale/rotate/stretch/`apply_function`, bounding box, `next_to`/`align_to`/`to_edge`.
- **S2.4** Color/opacity/style state on the data columns.
- **S2.5** Updaters (time- and non-time-based); `always_*` helpers.
- **S2.6** `Group`, `Point`; `value_tracker`.
- **S2.7** Unit tests for tree ops, transforms, bbox vs Python fixtures.

## Stage 3 — Rendering engine (the gate) 🔴

_Goal: VMobjects render with native Three.js at visual parity. Blocks everything visual. See [doc 02](./02-rendering-strategy.md)._

- **S3.1** `RenderBackend` contract + `ThreeRenderer` skeleton (canvas, `OrthographicCamera`, render loop).
- **S3.2** `Camera` + `CameraFrame` (pose/zoom as a Mobject driving the Three camera).
- **S3.3** VMobject **path** → `CurvePath` of `QuadraticBezierCurve3` (+ adaptive sampling).
- **S3.4** VMobject **stroke** → `Line2`/`LineMaterial` (world units, vertex colors).
- **S3.5** VMobject **fill** → `THREE.Shape`/`ShapeGeometry` (holes, subpaths).
- **S3.6** Render-group batching + `renderOrder`/`z_index`; depth test toggle.
- **S3.7** `#INSERT` shader resolver (for fallbacks).
- **S3.8** **De-risking spike**: circle, concave star, Bézier squiggle, one Tex — diff vs desktop-manim reference PNGs.
- **S3.9** Fidelity fallbacks _as needed_: winding-number fill pass; per-vertex stroke width via `onBeforeCompile`; stroke-AA parity.
- **S3.10** **Gate:** spike passes visual-regression threshold ([doc 06](./06-testing-strategy.md)) before Stage 4+ proceed.

## Stage 4 — VMobject completion & 2D geometry

_Goal: the shape vocabulary. Parallelizable once S3 gate passes._

- **S4.1** `VMobject` full API — `pointwise_become_partial`, `get_subpaths`, smoothing, subdivide, `VGroup`.
- **S4.2** `geometry.py` — Line, DashedLine, Arc, Circle, Dot, Ellipse, Polygon/Polyline, Rectangle/RoundedRectangle, Arrow/Vector/tips.
- **S4.3** `shape_matchers.py` — SurroundingRectangle, Underline, Cross, BackgroundRectangle.
- **S4.4** Visual-regression tests for each shape vs reference PNGs.

## Stage 5 — Animation system 🔴

_Goal: `play()`/`wait()` and the full animation library._

- **S5.1** Async **play/wait driver** (rAF clock; Promise-returning `play`) wired into Scene.
- **S5.2** `Animation` base — begin/interpolate/finish, rate, lag, time spans.
- **S5.3** `Scene` — add/remove, render-group assembly, undo state, `wait` conditions.
- **S5.4** `Transform` + **`align_data_and_family`** (column alignment) — the hard core.
- **S5.5** `composition` (AnimationGroup/Succession/LaggedStart); `update`.
- **S5.6** `creation` (ShowCreation/Write/DrawBorderThenFill) via partial-curve/dash.
- **S5.7** `fading`, `growing`, `rotation`, `movement`, `numbers`, `specialized`.
- **S5.8** `indication` (incl. per-vertex-width PassingFlash); `transform_matching_parts`.
- **S5.9** `.animate` builder (web-native syntax in the authoring layer).
- **S5.10** Tests: alpha-sampled state parity vs Python; visual regression on canonical scenes.

## Stage 6 — Coordinates, numbers, functions, 3D

_Goal: the math-content mobjects. Highly parallel; mostly 🟢._

- **S6.1** `coordinate_systems` — Axes, ThreeDAxes, NumberPlane, ComplexPlane, c2p/p2c.
- **S6.2** `number_line`, `numbers` (DecimalNumber/Integer), `matrix`.
- **S6.3** `functions` — ParametricCurve, FunctionGraph, ImplicitFunction (JS marching squares).
- **S6.4** `surface` + `three_dimensions` (Sphere/Cube/Torus/…) via `ParametricGeometry`.
- **S6.5** `point_cloud_mobject`, `dot_cloud` (glow fallback shader), `image_mobject`.
- **S6.6** `vector_field` (RK4 streamlines), `probability`, `frame`, `changing`.
- **S6.7** Tests + visual regression.

## Stage 7 — Text & Tex 🔴

_Goal: the highest-risk external-dependency replacements._

- **S7.1** `SVGMobject` via `SVGLoader` → `Shape`/`Line2` (validate on standalone SVGs).
- **S7.2** `Tex`/`TexText` — MathJax (or KaTeX) → SVG → `SVGLoader`; submobject structure.
- **S7.3** `string_mobject` substring isolation + `tex_to_color_map` (DOM-class labeling; JS assignment for label↔glyph matching).
- **S7.4** `text_mobject` — opentype.js glyph outlines → `Shape` (animatable); troika path for fast static labels.
- **S7.5** `brace`, `drawings` (composite icons; assets via `SVGLoader`).
- **S7.6** `boolean_ops` — paper.js union/difference/intersection/exclusion.
- **S7.7** `TransformMatchingTex`/`Strings` end-to-end.
- **S7.8** Visual regression on Tex/Text-heavy scenes (perceptual threshold; fonts will differ).

## Stage 8 — Interactivity (library: events & picking)

_Goal: a thin, embeddable interaction API. The live-coding **authoring tool** is **not** core-library scope — it lives in **kty-doc** (see "Library scope" above)._

- **S8.1** Event dispatcher + `THREE.Raycaster` hit-testing; per-mobject `onClick`/`onHover`/drag handlers; `window`/canvas events, resize, fullscreen. **(library)**

_Moved to **kty-doc** (playground app, consuming the published library):_

- **InteractiveScene** — selection, move/scale/rotate gizmos, key bindings.
- **Live editor** — in-browser code editor (Monaco/CodeMirror) → sandboxed eval, Vite HMR hot-reload (the web replacement for IPython `embed`/`reload_scene`/`checkpoint_paste`).

_Dropped (not library-shaped):_

- ~~Web-native authoring DSL~~ — the JS API is the authoring surface; a second DSL is needless surface area.
- ~~Scene registry / `extract_scene`~~ — a CLI concept; a library consumer imports and calls directly.

## Stage 9 — Embeddability & export (library) + media demos (kty-doc)

_Goal: make kty pleasant to embed and able to emit frames. Heavy "make a video" media assembly is demonstrated in **kty-doc**, not shipped in the core bundle ([doc 05](./05-web-improvements.md))._

- **S9.1** Deterministic **export driver** (fixed-`dt` stepping to a render target). **(library)**
- **S9.3** Image/SVG export (`toPNG`/`toSVG`) — lightweight. **(library)**
- **S9.4** Web improvements: responsive canvas, embeddable **`<kty-scene>` web component**, shareable scene URLs, perf (instancing, frustum culling, attribute reuse). **(library)**

_Hosted in **kty-doc** (playground/showcase), not the core package:_

- **Video export** — WebCodecs `VideoEncoder` + `mp4-muxer` (MediaRecorder fallback; transparent option). Built on S9.1's frame driver and demoed as a "record to mp4" button rather than a core dependency. _(Extract to an optional `@viesar/kty-export` package later only if real demand appears.)_
- **Audio** (Web Audio API) and **GIF export** — video/app concerns; kty-doc demos.

## Stage 10 — Parity, docs, release (the "real library" stage)

_Goal: close the gap to 1:1 and make kty adoptable. Almost entirely library work; docs are the highest-leverage item._

- **S10.1** Port remaining `once_useful_constructs`/long-tail mobjects — a library is judged by what it can draw.
- **S10.2** **Parity test suite** (dev tooling, not shipped): port `example_scenes.py` + a curated set; diff against desktop-manim; track a parity scoreboard.
- **S10.3** **API docs + migration guide** ("manim → kty" cheatsheet) + runnable examples gallery — **highest-priority adoption lever**.
- **S10.4** Perf budget pass (60fps typical scenes; memory ceilings; bundle-size budget).
- **S10.5** Versioned release; publish to npm + demo site. ✅ _initial release shipped (`@viesar/kty` on npm, docs site live); ongoing as the API stabilizes toward 1.0._

---

## Critical path

```
kty (library):
S0 ─▶ S1 ─▶ S2 ─▶ S3 (GATE) ─┬─▶ S4 ─▶ S5 ─┬─▶ S8.1 ─▶ S9 (lib) ─▶ S10
                             ├─▶ S6          │
                             └─▶ S7 ─────────┘

kty-doc (app, consumes the published library):
   playground (InteractiveScene + live editor)  ·  video/audio/GIF export demos
```

S3 is the gate. After it, S4/S6/S7 can run in parallel; S5 needs S4; the library's S8.1/S9 need S5. The **app-shaped** work (interactive editor, video/audio export) is built in **kty-doc** against the published package, so it doesn't block or bloat the core library. Estimate stages in story-points only after the S3 spike, because it converts the largest unknown (stroke/fill parity) into a measured quantity.
