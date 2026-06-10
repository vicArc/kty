# 01 — Target Architecture

## Layering

The port is organized as concentric layers. Inner layers have no knowledge of outer ones. This mirrors manim's own structure but makes the renderer pluggable (so a future WebGPU backend doesn't touch the engine).

```
┌──────────────────────────────────────────────────────────────┐
│  Authoring layer (web-native, thin)                          │  hybrid API
│   scene DSL · async play() · declarative groups · live editor│
├──────────────────────────────────────────────────────────────┤
│  Engine (faithful 1:1 port of manim semantics)               │
│   Scene · Animation · Mobject/VMobject · Camera · updaters    │
├──────────────────────────────────────────────────────────────┤
│  Render backend (pluggable)                                  │
│   ThreeRenderer (WebGL2)  ──[interface]──  (future) WebGPU    │
├──────────────────────────────────────────────────────────────┤
│  Foundation                                                  │
│   data store · bezier · space_ops · color · constants · config│
└──────────────────────────────────────────────────────────────┘
```

> **Language note:** all source is **plain modern JavaScript (ESM)**. Class fields use native `#private` syntax; "contracts" below are duck-typed base classes or documented shapes, not TypeScript `interface`s. JSDoc `@typedef`/`@param` comments are optional and exist only for editor hints.

Map to directories (proposed):

```
src/
  foundation/    constants, config, color, iterables, math (bezier, space_ops)
  data/          MobjectData column store, family ops
  mobject/       Mobject, VMobject, Group, geometry, svg, text, tex, types/, coordinate_systems...
  animation/     Animation base + all concrete animations, rate_functions, paths
  scene/         Scene, InteractiveScene, render-group batching, event dispatch
  camera/        Camera, CameraFrame
  render/        RenderBackend interface, three/ (ThreeRenderer, materials, geometry builders)
  authoring/     web-native DSL, live editor glue, hot-reload
  export/        WebCodecs video, PNG/SVG export
  index.ts       barrel
tests/           unit (Vitest), parity, visual (Playwright)
reference/       golden PNGs rendered by desktop manim for parity checks
```

## Concept mapping: manim → kty

| manim (Python)                           | kty (TS / Three.js)                                                         | Notes                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Mobject`                                | `Mobject` extends a thin wrapper over `THREE.Object3D`                      | Hierarchy via `Object3D.children`; manim's `submobjects` kept as the canonical list, synced to the Three node. |
| `Mobject.data` (numpy structured array)  | **SoA column store**: one `Float32Array` per attribute (`point`, `rgba`, …) | See "Data model" below. Maps 1:1 to `THREE.BufferAttribute`.                                                   |
| `Mobject.uniforms` (dict)                | `uniforms: Record<string, number \| Float32Array>`                          | Feeds `ShaderMaterial.uniforms`.                                                                               |
| `VMobject`                               | `VMobject` + a bezier→geometry builder                                      | The crux. See [doc 02](./02-rendering-strategy.md).                                                            |
| `Surface` / 3D                           | `THREE.BufferGeometry` grid + `MeshStandardMaterial`/custom                 | Mostly native.                                                                                                 |
| `PMobject`/`DotCloud`                    | `THREE.Points` + custom point material                                      | Native.                                                                                                        |
| `ImageMobject`                           | `THREE.Mesh` + `MeshBasicMaterial({map})`                                   | Native.                                                                                                        |
| `ShaderWrapper`                          | `RenderBackend` adapter producing a Three material+geometry                 | Geometry-shader logic relocated; see doc 02.                                                                   |
| `Camera` / `Camera.capture()`            | `ThreeRenderer.render(scene, frame)` to canvas or render target             | `capture()`'s shader-grouping becomes render-group batching.                                                   |
| `CameraFrame`                            | a Mobject controlling a `THREE.Camera` (orthographic by default)            | Moving the camera = transforming this mobject, as in manim.                                                    |
| `Scene.play()` (blocking, frame loop)    | `async play()` driven by `requestAnimationFrame`                            | See "Time & the play loop" below.                                                                              |
| `Animation.interpolate(alpha)`           | identical contract                                                          | Pure logic port.                                                                                               |
| `updaters`                               | identical; ticked each frame                                                | Pure logic port.                                                                                               |
| `EVENT_DISPATCHER` + `is_point_touching` | event dispatcher + `THREE.Raycaster`                                        | Hit-testing via raycast.                                                                                       |
| global `manim_config` (addict Dict)      | `config` module + reactive store                                            | Immutable-ish; dot access becomes typed getters.                                                               |
| `from manimlib import *`                 | `import { ... } from 'kty'` (barrel)                                        | No star imports.                                                                                               |

## Data model: numpy structured arrays → SoA column store

manim's single most pervasive Python-ism is `Mobject.data`: a numpy **structured** array where each row is a vertex and columns are named fields of mixed shape (`point: float32[3]`, `rgba: float32[4]`, `stroke_width: float32[1]`, …). Vectorized slice assignment (`data['point'][1::2] = ...`) is everywhere.

**Decision: do NOT emulate numpy structured dtypes.** Instead use a **Structure-of-Arrays (SoA)** store: each attribute is its own contiguous `Float32Array`. This:

- maps **directly** onto `THREE.BufferAttribute` (zero-copy upload), and
- is faster for the GPU and for the column-wise operations manim actually does.

Sketch (plain JS):

```js
class MobjectData {
  #columns = new Map(); // name -> { array: Float32Array, itemSize: number }
  length = 0; // number of vertices/points
  get(name) {
    /* returns the Float32Array for a column */
  }
  resize(n) {
    /* resize_preserving_order / interpolation variants */
  }
  setColumn(name, data) {
    /* upload an attribute column */
  }
  // helpers mirroring the numpy ops manim relies on:
  // pointwise interpolate, lerp between two stores, strided slice-assign, etc.
  // Each column maps 1:1 to a THREE.BufferAttribute (zero-copy).
}
```

A small **array-helper module** provides the handful of numpy operations manim leans on (broadcasting lerp, `resize_with_interpolation`, strided views, `nan_to_num`) so per-mobject code reads almost like the Python. We port those helpers once, in the foundation layer, and never reach for a heavy numpy-in-JS library.

## Time & the play loop

manim's `Scene.play()` is **synchronous and blocking**: it computes a frame-time array, and for each `t` it interpolates every animation, calls `update_frame`, and `emit_frame`. On the web we cannot block the main thread.

**Design:**

- A single `requestAnimationFrame` driver owns the clock.
- `scene.play(...anims)` returns a `Promise` that resolves when the animations finish. Internally it registers the animations with the driver; each rAF tick advances `time`, computes `alpha` per animation, calls `interpolate(alpha)`, runs updaters, and renders.
- `await scene.play(a, b)` then `await scene.play(c)` gives the same _sequential_ authoring feel as manim's blocking calls, but cooperatively scheduled.
- `scene.wait(t)` is just an animation-free time advance returning a Promise.
- **Export mode** swaps the driver: instead of rAF/wall-clock, it steps a fixed `dt = 1/fps`, renders to a render target, and feeds frames to the encoder — giving deterministic, frame-accurate output decoupled from real time. The engine code is identical; only the driver differs.

This driver-swap is the key to satisfying "interactive first, export later" without forking the engine.

## Render backend contract (keep Three.js swappable)

Define a narrow contract (a base class with documented methods — no TS `interface`) so the rendering details and a future WebGPU backend live behind one seam:

```js
// render/RenderBackend.js — duck-typed contract; ThreeRenderer extends it.
class RenderBackend {
  buildVMobject(vm) {} // adapt a VMobject onto native Three objects (Line2 + ShapeGeometry/Mesh)
  buildSurface(s) {} // -> ParametricGeometry / BufferGeometry
  buildPoints(p) {} // -> THREE.Points (or instanced)
  update(handle, m) {} // re-upload only changed columns
  render(groups, frame, target = null) {} // draw render-groups to canvas or a WebGLRenderTarget
}
```

`ThreeRenderer` is the only implementation for now. **The engine never imports Three.js directly outside `render/three/`** — so manim-semantic code stays renderer-agnostic and a WebGPU backend can drop in later.
