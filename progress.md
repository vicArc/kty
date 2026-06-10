# kty Migration Progress

Tracks the ManimGL → web port. Task IDs mirror [`docs/04-migration-stages.md`](./docs/04-migration-stages.md).

**Status key:** ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked · ⏭️ skipped/deferred

**How to use:** when you pick up a task, set it 🟡 and put your name + date in Notes. When it merges, set ✅. Keep the per-stage summary line current. Don't delete tasks — mark ⏭️ with a reason.

_Last updated: 2026-06-10 — plan created; no code yet._

---

## Summary

| Stage | Title                                | Status | Done / Total |
| ----- | ------------------------------------ | ------ | ------------ |
| 0     | Repo & tooling foundation            | ⬜     | 0 / 7        |
| 1     | Foundation (math, color, config)     | ⬜     | 0 / 9        |
| 2     | Mobject core & data model            | ⬜     | 0 / 7        |
| 3     | Rendering engine (🔴 gate)           | ⬜     | 0 / 10       |
| 4     | VMobject completion & 2D geometry    | ⬜     | 0 / 4        |
| 5     | Animation system (🔴)                | ⬜     | 0 / 10       |
| 6     | Coordinates, numbers, functions, 3D  | ⬜     | 0 / 7        |
| 7     | Text & Tex (🔴)                      | ⬜     | 0 / 8        |
| 8     | Interactivity & web-native authoring | ⬜     | 0 / 5        |
| 9     | Export & web polish                  | ⬜     | 0 / 5        |
| 10    | Parity sweep, docs, release          | ⬜     | 0 / 5        |
|       | **Total**                            |        | **0 / 77**   |

---

## Stage 0 — Repo & tooling foundation

| ID   | Task                                                                                       | Status | Notes         |
| ---- | ------------------------------------------------------------------------------------------ | ------ | ------------- |
| S0.1 | npm init (ESM) + core deps (three, vite, vitest, playwright, pixelmatch, eslint, prettier) | ⬜     |               |
| S0.2 | Vite config + folder scaffold                                                              | ⬜     |               |
| S0.3 | ESLint flat config + Prettier (+ optional jsconfig checkJs)                                | ⬜     |               |
| S0.4 | Vitest + JUnit reporter; smoke test green                                                  | ⬜     |               |
| S0.5 | GitHub Actions CI (lint+unit+build)                                                        | ⬜     |               |
| S0.6 | Repo write-protection: MIT LICENSE + protect main (stays public)                           | ⬜     | docs/07 A1–A2 |
| S0.7 | First commit + push; verify CI + protection                                                | ⬜     |               |

## Stage 1 — Foundation

| ID   | Task                                              | Status | Notes |
| ---- | ------------------------------------------------- | ------ | ----- |
| S1.1 | constants (directions, angles, frame, colors)     | ⬜     |       |
| S1.2 | config module + reactive store                    | ⬜     |       |
| S1.3 | color (conversions, gradients, colormaps)         | ⬜     |       |
| S1.4 | iterables, dict_ops, simple_functions, family_ops | ⬜     |       |
| S1.5 | space_ops (+ earcut)                              | ⬜     |       |
| S1.6 | bezier (+ banded solver, cubic→quad)              | ⬜     |       |
| S1.7 | rate_functions + paths                            | ⬜     |       |
| S1.8 | array-helper module (data-store backing)          | ⬜     |       |
| S1.9 | parity unit tests vs Python fixtures              | ⬜     |       |

## Stage 2 — Mobject core & data model

| ID   | Task                                     | Status | Notes |
| ---- | ---------------------------------------- | ------ | ----- |
| S2.1 | MobjectData SoA column store             | ⬜     |       |
| S2.2 | Mobject base (family, add/remove, clone) | ⬜     |       |
| S2.3 | Transforms + bbox + positioning helpers  | ⬜     |       |
| S2.4 | color/opacity/style on data columns      | ⬜     |       |
| S2.5 | updaters (time + non-time)               | ⬜     |       |
| S2.6 | Group, Point, value_tracker              | ⬜     |       |
| S2.7 | unit tests vs Python fixtures            | ⬜     |       |

## Stage 3 — Rendering engine 🔴 (GATE)

| ID    | Task                                               | Status | Notes      |
| ----- | -------------------------------------------------- | ------ | ---------- |
| S3.1  | RenderBackend contract + ThreeRenderer skeleton    | ⬜     |            |
| S3.2  | Camera + CameraFrame                               | ⬜     |            |
| S3.3  | VMobject path → CurvePath/QuadraticBezierCurve3    | ⬜     |            |
| S3.4  | stroke → Line2/LineMaterial                        | ⬜     |            |
| S3.5  | fill → Shape/ShapeGeometry                         | ⬜     |            |
| S3.6  | render-group batching + renderOrder/z_index        | ⬜     |            |
| S3.7  | #INSERT shader resolver                            | ⬜     |            |
| S3.8  | de-risking spike (circle/star/squiggle/Tex)        | ⬜     |            |
| S3.9  | fidelity fallbacks (winding/width/AA) as needed    | ⬜     |            |
| S3.10 | **GATE:** spike passes visual-regression threshold | ⛔     | blocks S4+ |

## Stage 4 — VMobject completion & 2D geometry

| ID   | Task                                                     | Status | Notes |
| ---- | -------------------------------------------------------- | ------ | ----- |
| S4.1 | VMobject full API (partial, subpaths, smoothing, VGroup) | ⬜     |       |
| S4.2 | geometry.py shapes (Line…Arrow/tips)                     | ⬜     |       |
| S4.3 | shape_matchers (SurroundingRectangle, Underline, Cross)  | ⬜     |       |
| S4.4 | visual-regression per shape                              | ⬜     |       |

## Stage 5 — Animation system 🔴

| ID    | Task                                                 | Status | Notes     |
| ----- | ---------------------------------------------------- | ------ | --------- |
| S5.1  | async play/wait driver (rAF, Promise)                | ⬜     |           |
| S5.2  | Animation base                                       | ⬜     |           |
| S5.3  | Scene (add/remove, render groups, undo, wait)        | ⬜     |           |
| S5.4  | Transform + align_data_and_family                    | ⬜     | hard core |
| S5.5  | composition + update                                 | ⬜     |           |
| S5.6  | creation (ShowCreation/Write/DrawBorderThenFill)     | ⬜     |           |
| S5.7  | fading/growing/rotation/movement/numbers/specialized | ⬜     |           |
| S5.8  | indication + transform_matching_parts                | ⬜     |           |
| S5.9  | .animate builder (web-native)                        | ⬜     |           |
| S5.10 | parity + visual tests                                | ⬜     |           |

## Stage 6 — Coordinates, numbers, functions, 3D

| ID   | Task                                            | Status | Notes |
| ---- | ----------------------------------------------- | ------ | ----- |
| S6.1 | coordinate_systems (Axes, NumberPlane, c2p/p2c) | ⬜     |       |
| S6.2 | number_line, numbers, matrix                    | ⬜     |       |
| S6.3 | functions (Parametric, Graph, Implicit)         | ⬜     |       |
| S6.4 | surface + three_dimensions (ParametricGeometry) | ⬜     |       |
| S6.5 | point_cloud, dot_cloud (glow), image_mobject    | ⬜     |       |
| S6.6 | vector_field, probability, frame, changing      | ⬜     |       |
| S6.7 | tests + visual regression                       | ⬜     |       |

## Stage 7 — Text & Tex 🔴

| ID   | Task                                        | Status | Notes |
| ---- | ------------------------------------------- | ------ | ----- |
| S7.1 | SVGMobject via SVGLoader                    | ⬜     |       |
| S7.2 | Tex/TexText (MathJax/KaTeX → SVGLoader)     | ⬜     |       |
| S7.3 | string_mobject isolation + tex_to_color_map | ⬜     |       |
| S7.4 | text_mobject (opentype.js / troika)         | ⬜     |       |
| S7.5 | brace, drawings                             | ⬜     |       |
| S7.6 | boolean_ops (paper.js)                      | ⬜     |       |
| S7.7 | TransformMatchingTex/Strings                | ⬜     |       |
| S7.8 | visual regression (perceptual threshold)    | ⬜     |       |

## Stage 8 — Interactivity & web-native authoring

| ID   | Task                                         | Status | Notes |
| ---- | -------------------------------------------- | ------ | ----- |
| S8.1 | event dispatcher + Raycaster + window events | ⬜     |       |
| S8.2 | InteractiveScene (selection, gizmos, keys)   | ⬜     |       |
| S8.3 | web-native authoring DSL                     | ⬜     |       |
| S8.4 | live editor + HMR hot reload                 | ⬜     |       |
| S8.5 | scene registry / extract_scene equivalent    | ⬜     |       |

## Stage 9 — Export & web polish

| ID   | Task                                                         | Status | Notes |
| ---- | ------------------------------------------------------------ | ------ | ----- |
| S9.1 | deterministic export driver (fixed dt)                       | ⬜     |       |
| S9.2 | video export (WebCodecs + mp4-muxer; MediaRecorder fallback) | ⬜     |       |
| S9.3 | image/SVG/GIF export                                         | ⬜     |       |
| S9.4 | web improvements (responsive, web component, perf)           | ⬜     |       |
| S9.5 | audio (Web Audio API)                                        | ⬜     |       |

## Stage 10 — Parity sweep, docs, release

| ID    | Task                                             | Status | Notes |
| ----- | ------------------------------------------------ | ------ | ----- |
| S10.1 | long-tail mobjects / once_useful_constructs      | ⬜     |       |
| S10.2 | parity suite over example_scenes.py + scoreboard | ⬜     |       |
| S10.3 | API docs + manim→kty migration guide + examples  | ⬜     |       |
| S10.4 | perf budget pass (60fps target)                  | ⬜     |       |
| S10.5 | versioned release + npm + demo site              | ⬜     |       |
