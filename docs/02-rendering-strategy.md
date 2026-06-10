# 02 — Rendering Strategy (the central challenge)

> The most important document in the plan. If the VMobject renderer is wrong, nothing above it looks like manim. Read it before estimating Stage 3.
>
> **Guiding rule (per project direction):** _adapt Mobjects onto native Three.js objects first._ Reimplement manim's custom GLSL only where Three.js's built-ins can't reach the required fidelity.

## The blocker, briefly

Almost everything in a manim frame — every shape, Tex glyph, axis — is a **VMobject**: a path of **quadratic Bézier** segments with a _fill_ and a _stroke_. ManimGL renders these with GPU **geometry shaders** (`shaders/quadratic_bezier/{stroke,fill}/geom.glsl`): one segment's 3 control points are expanded on the GPU into a stroke triangle-strip (with miter/bevel joints and SDF anti-aliasing) or into fill triangles (with winding-number inside/outside testing).

**WebGL2 has no geometry shaders.** So the geometry-shader work must be relocated. The good news: **Three.js already ships the relocations** as first-class objects. We don't hand-roll a geometry pipeline — we map onto Three's.

## The native adaptation (primary path)

| manim construct                                                              | Native Three.js adaptation                                                                                                                                             | Module                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| VMobject **path** (quadratic anchors+handles)                                | `THREE.CurvePath` of `QuadraticBezierCurve3`; sample with `.getPoints(n)` / `.getPoint(t)`                                                                             | core three                                         |
| VMobject **stroke** (fat, world-unit, per-vertex color/width, caps & joints) | **`Line2` + `LineGeometry` + `LineMaterial`** (renders fat lines via instanced segment quads in world units — the native equivalent of manim's stroke geometry shader) | `three/examples/jsm/lines/*`                       |
| VMobject **fill** (concave, holes, winding)                                  | **`THREE.Shape`** (`moveTo`/`quadraticCurveTo`/`holes`) → **`ShapeGeometry`** (triangulates via earcut) → `Mesh` + `MeshBasicMaterial`                                 | core three                                         |
| **SVGMobject** & **Tex** (SVG → paths)                                       | **`SVGLoader`** parses SVG path data into `ShapePath`s → `ShapeGeometry` fills (+ `Line2` strokes)                                                                     | `three/examples/jsm/loaders/SVGLoader`             |
| **Surface / 3D** parametric                                                  | **`ParametricGeometry`**; normals/`MeshStandardMaterial` native                                                                                                        | `three/examples/jsm/geometries/ParametricGeometry` |
| **PMobject / DotCloud**                                                      | `THREE.Points` + `PointsMaterial` (size attenuation), or instanced sprites for glow                                                                                    | core three                                         |
| **ImageMobject**                                                             | `THREE.Mesh` + `MeshBasicMaterial({ map })`                                                                                                                            | core three                                         |
| `text`/glyphs as outlines                                                    | glyph outline → `THREE.Shape` (via opentype.js) → `ShapeGeometry`; or `TextGeometry` for extruded 3D text                                                              | core + `examples/jsm/geometries/TextGeometry`      |

This adaptation turns "reimplement two geometry shaders" into "drive three well-tested Three.js builders," which is the single biggest risk reduction in the whole project.

### Stroke detail — `Line2`

`Line2` (with `LineGeometry`/`LineMaterial`) is Three's fat-line system: it expands each polyline segment into a screen- or world-space quad in its own vertex shader, supports `worldUnits: true` (so stroke width tracks manim's world coordinates), `vertexColors` (per-vertex stroke color → manim's `stroke_rgba` column), and dashing.

- Build: sample the VMobject's `CurvePath` to a polyline at adaptive resolution (flatter curves → fewer points), feed `LineGeometry.setPositions(...)` + `setColors(...)`.
- **Per-vertex stroke _width_** (manim's `stroke_width` column varies along a path, e.g. in `VShowPassingFlash`): `LineMaterial` has a single `linewidth`. To vary width per vertex we add a small patch via `material.onBeforeCompile` injecting a per-instance width attribute — a ~20-line shader tweak, far less than porting the whole geom shader. Where width is constant (the common case), stock `Line2` suffices untouched.
- **Joints/caps**: `Line2` handles segment joints acceptably for most content; for manim-exact miter/bevel on sharp corners, the `onBeforeCompile` patch can apply the joint-angle correction (manim already stores a `joint_angle` column we can feed in).

### Fill detail — `THREE.Shape`

`THREE.Path`/`Shape` directly accept `quadraticCurveTo` — the exact primitive manim's paths are made of — and `Shape.holes` handles interior holes (letters like "O", "A"). `ShapeGeometry` triangulates with earcut.

- Build a `Shape` per subpath; assign holes by even-odd/containment (same logic manim uses to detect closed subpaths via anchor==handle).
- **Winding caveat**: earcut/`ShapeGeometry` use even-odd-ish containment, while manim fills by **nonzero winding number**. For typical glyphs and shapes these agree. For self-intersecting paths they can differ → that's the one case we fall back to a custom **winding-number render pass** (see fidelity fallback below).
- Animating an existing fill (color, opacity, partial reveal) touches material uniforms / attributes only — no re-triangulation per frame. Re-triangulate only when the _path_ changes.

### Tex / SVG detail — `SVGLoader`

Both `SVGMobject` and `Tex` reduce to "SVG → filled/stroked paths," which is exactly what `SVGLoader` does:

```
LaTeX string ──MathJax/KaTeX──▶ SVG string ──SVGLoader.parse──▶ ShapePath[]
   ShapePath.toShapes() ──▶ THREE.Shape[] ──ShapeGeometry──▶ filled glyph meshes
```

Each glyph/sub-path becomes a child VMobject (preserving manim's submobject structure for `tex_to_color_map`, `TransformMatchingTex`, etc.). This is the native pipeline for the entire Stage 7 text/Tex work, not a workaround.

## Fidelity fallback (custom shaders — only where needed)

Keep a thin custom-shader path for the few places native Three.js can't match manim exactly:

1. **Winding-number fill** for self-intersecting paths — render fill triangles into an R-channel `WebGLRenderTarget` with additive blending to accumulate winding, then a compositing pass keeps `winding != 0`. (Direct port of manim's `fill` approach.)
2. **SDF stroke AA parity** — if `Line2`'s anti-aliasing doesn't match manim's `smoothstep` SDF closely enough, swap in manim's `stroke/frag.glsl` on the `Line2` material via `onBeforeCompile`.
3. **Glow/true-dot** radial SDF — port `true_dot/frag.glsl` onto an instanced quad or `Points` material.

These are opt-in per-Mobject (a flag), default off. The `#INSERT` preprocessor (manim's `#include` substitute) is reproduced with a tiny string resolver or `glslify` for these cases.

## Partial reveal, the `ShowCreation` workhorse

manim's `pointwise_become_partial(a, b)` (used by `ShowCreation`, `Write`, passing-flash) becomes **curve resampling**: take the VMobject's `CurvePath` and rebuild geometry from `getPoint(a)`…`getPoint(b)`. For `Line2`, re-`setPositions` the truncated polyline; for fill, re-`Shape` the partial path. Cheap enough per frame for single objects; for many objects, prefer the dash-offset trick on `LineMaterial` (animate `dashOffset`/`gapSize`) to avoid rebuilds.

## Camera, framebuffers, batching

- `Camera.capture()` → `ThreeRenderer.render()`. manim's `assemble_render_groups` (batch by shader/type/`z_index` via `batch_by_property`) is preserved as render-group batching to minimize draw calls and honor draw order. With native objects this largely becomes ordinary Three scene-graph traversal plus explicit `renderOrder`.
- Default camera is **`THREE.OrthographicCamera`** (manim's frame is a flat 8-unit-high world); `PerspectiveCamera` for 3D scenes, both driven by `CameraFrame`.
- **FBOs**: `WebGLRenderTarget` for offscreen/export and the winding fallback. MSAA via WebGL2 multisampled targets (or `WEBGL_multisampled_render_to_texture`).
- **Readback** (export): `gl.readPixels` is synchronous and can stall; in export mode use async pixel-pack-buffer readback so encoding doesn't block the render loop.

## Risk summary for this layer

| Component                                     | Risk (native path)    | Reason                                                                                                      |
| --------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| VMobject **stroke** via `Line2`               | **Medium**            | Native fat lines solve the hard part; per-vertex width + exact joints need a small `onBeforeCompile` patch. |
| VMobject **fill** via `Shape`/`ShapeGeometry` | **Medium**            | Native concave+holes; self-intersecting winding needs the fallback pass.                                    |
| Tex/SVG via `SVGLoader`                       | **Medium**            | Parsing is native; submobject mapping & color labels need care (Stage 7).                                   |
| Camera / FBO / batching                       | Low–Medium            | Mostly native Three; readback stalls in export.                                                             |
| Dots / surfaces / images                      | Low                   | Native `Points` / `ParametricGeometry` / textured mesh.                                                     |
| Custom-shader fallbacks                       | High **but isolated** | Only invoked for winding/AA/glow parity; not on the critical path.                                          |

**Compared to a from-scratch geometry-shader port, leaning on Three.js drops the central risk from "Very High" to "Medium."**

## De-risking spike (do this first in Stage 3)

Before any animation work depends on the renderer, build a standalone spike that renders, via the **native** path, and diffs against desktop-manim reference PNGs:

1. a stroked + filled **circle** (`Line2` + `ShapeGeometry`),
2. a **concave star** (winding correctness),
3. a free **Bézier squiggle** (stroke joints/AA),
4. one **Tex** expression (`MathJax → SVGLoader`).

Gate Stage 4+ on this spike hitting the visual-regression threshold (see [doc 06](./06-testing-strategy.md)). If (2) fails on a self-intersecting case, enable the winding fallback and re-test.
