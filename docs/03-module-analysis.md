# 03 — Module Analysis

Per-module inventory of `manimlib/` (~89 files, ~23k LOC), with the native-Three.js adaptation and a risk rating. Risk reflects porting effort + uncertainty, **after** applying the "native Three.js first" rule from [doc 02](./02-rendering-strategy.md).

Legend — **Risk**: 🟢 Low (mechanical port) · 🟡 Medium (design needed) · 🔴 High (hard problem / external-dep replacement).

---

## Foundation & infrastructure (`utils/`, config, constants)

| Source                                                          | Role                                                       | Adaptation                                                                                                                          | Risk |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `constants.py`                                                  | Colors, direction vectors, frame geometry, angles, buffers | Export as JS consts; vectors → `Vector3` or `[x,y,z]`; computed from config at init                                                 | 🟢   |
| `config.py` + `default_config.yml`                              | CLI + YAML merge → global `manim_config` Dict              | JS config module + small reactive store; defaults as JSON; drop CLI (URL params/UI). **Global mutable state is the main refactor.** | 🟡   |
| `typing.py`                                                     | Type aliases                                               | Drop (no TS). Keep as JSDoc `@typedef`s if useful                                                                                   | 🟢   |
| `logger.py`                                                     | Rich logging                                               | `console` wrapper or `loglevel`; optional in-app panel                                                                              | 🟢   |
| `utils/color.py`                                                | Color conversions, gradients, colormaps                    | `culori`/`colord`; port gradient/lerp helpers                                                                                       | 🟢   |
| `utils/bezier.py`                                               | Bézier eval, partial curves, smooth handles, cubic→quad    | **Mostly pure-math port.** `solve_banded` → small banded solver; `cu2qu` → port or `fontkit`. Some overlaps `THREE.Curve`           | 🟡   |
| `utils/space_ops.py`                                            | Vectors, rotations, earclip, intersections                 | `Vector3`/`Quaternion`/`Matrix4` for most; `earcut` for triangulation                                                               | 🟢   |
| `utils/iterables.py`                                            | dedup, batch, resize, interpolate arrays                   | Pure JS port                                                                                                                        | 🟢   |
| `utils/family_ops.py`                                           | Mobject tree flatten/remove                                | Pure port over the new Mobject API                                                                                                  | 🟢   |
| `utils/dict_ops.py`                                             | Recursive dict merge                                       | Trivial (or `lodash.merge`)                                                                                                         | 🟢   |
| `utils/simple_functions.py`                                     | sigmoid, choose, clip, bisect, hash                        | Pure port; `@lru_cache`→memoize; hash→`crypto.subtle`                                                                               | 🟢   |
| `utils/rate_functions.py`                                       | Easing functions                                           | Pure port; `np.*`→`Math.*`; bezier-based use ported bezier                                                                          | 🟢   |
| `utils/paths.py`                                                | straight/arc path interpolation                            | Pure port; arc via `Quaternion`                                                                                                     | 🟡   |
| `utils/tex_to_symbol_count.py`                                  | LaTeX command→glyph-count table                            | Convert dict to JS object                                                                                                           | 🟢   |
| `utils/cache.py`                                                | `diskcache` decorator                                      | In-memory `Map` + IndexedDB for persistence                                                                                         | 🟢   |
| `utils/directories.py`, `file_ops.py`, `images.py`, `sounds.py` | Filesystem, downloads, audio                               | **Mostly drop.** Assets via URL/fetch; audio via Web Audio API; inversion via canvas/WebGL                                          | 🟢   |
| `utils/debug.py`                                                | Tree printing / index labels                               | Port to console + label mobjects                                                                                                    | 🟢   |
| `utils/shaders.py`                                              | shader loading, colormap GLSL                              | Inline shader strings + `#INSERT` resolver                                                                                          | 🟡   |
| `utils/tex_file_writing.py`                                     | **LaTeX→DVI→SVG subprocess + cache**                       | **Replace entirely** with MathJax/KaTeX → SVG → `SVGLoader`                                                                         | 🔴   |
| `utils/tex.py`                                                  | Count tex symbols                                          | Regex + table port                                                                                                                  | 🟢   |
| `logger.py`, `event_handler/*`                                  | Mouse/keyboard dispatch                                    | DOM events + `THREE.Raycaster`; small dispatcher class; enum→JS object                                                              | 🟢   |
| `module_loader.py`                                              | Dynamic import + `__import__` patching                     | **Replace**: static scene registry (bundled) or sandboxed eval in the live editor                                                   | 🔴   |
| `extract_scene.py`                                              | Find/instantiate Scene subclasses                          | Scene registry lookup; drop source-injection embed                                                                                  | 🟡   |
| `__main__.py`                                                   | CLI entry + reload loop                                    | Trivial: instantiate + `scene.run()`; reload via Vite HMR                                                                           | 🟢   |
| `__init__.py`                                                   | Star re-exports                                            | Barrel `index.js`                                                                                                                   | 🟢   |

## Data model & base mobject

| Source                                 | Role                                                                         | Adaptation                                                                                                                                             | Risk |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| `mobject/mobject.py`                   | **Base Mobject**: data arrays, family tree, transforms, updaters, bbox, copy | SoA column store (doc 01) wrapping `Object3D`; port transforms/updaters/bbox; structured dtype → per-attribute `Float32Array`; deepcopy→explicit clone | 🔴   |
| `mobject/types/vectorized_mobject.py`  | **VMobject**: bezier paths, fill+stroke, triangulation, joints               | Native: `CurvePath`+`Line2`+`Shape`/`ShapeGeometry` (doc 02). The keystone class                                                                       | 🔴   |
| `mobject/types/surface.py`             | Parametric surfaces, normals, face sort                                      | `ParametricGeometry`; normals native; sort via updater                                                                                                 | 🟡   |
| `mobject/types/point_cloud_mobject.py` | PMobject                                                                     | `THREE.Points` + color attr                                                                                                                            | 🟢   |
| `mobject/types/dot_cloud.py`           | Variable-radius dots, glow                                                   | `Points`/instanced + glow SDF (fallback shader)                                                                                                        | 🟡   |
| `mobject/types/image_mobject.py`       | Raster quad                                                                  | Textured `Mesh`                                                                                                                                        | 🟢   |
| `shader_wrapper.py`                    | GPU program/VBO/VAO mgmt, V-shader fill/stroke passes                        | Folds into `ThreeRenderer` material/geometry builders; geom-shader logic → `Line2`/`Shape` (doc 02)                                                    | 🔴   |
| `mobject/value_tracker.py`             | Value-as-uniform                                                             | Plain class with get/set                                                                                                                               | 🟢   |
| `mobject/changing.py`                  | AnimatedBoundary, TracedPath                                                 | Updaters + partial-curve resample                                                                                                                      | 🟡   |
| `mobject/mobject_update_utils.py`      | Updater helpers                                                              | Pure port                                                                                                                                              | 🟢   |

## Animation system (`animation/`)

| Source                                  | Role                                                              | Adaptation                                                                             | Risk |
| --------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---- |
| `animation/animation.py`                | **Base Animation**: `interpolate(alpha)`, begin/finish, rate, lag | Pure port; integrates with async `play()` driver (doc 01)                              | 🟡   |
| `animation/transform.py`                | **Transform** + `.animate`, ApplyMethod/Matrix/Function           | Port; **`align_data_and_family`** (column alignment of source↔target) is the hard core | 🔴   |
| `animation/composition.py`              | AnimationGroup, Succession, LaggedStart                           | Pure timing port                                                                       | 🟢   |
| `animation/creation.py`                 | ShowCreation, Write, DrawBorderThenFill                           | Partial-curve resample / dash-offset (doc 02)                                          | 🟡   |
| `animation/fading.py`                   | Fade(In/Out), FadeTransform, VFade                                | Opacity/scale tween via material + transform                                           | 🟢   |
| `animation/growing.py`                  | GrowFrom\*                                                        | Transform subclasses                                                                   | 🟢   |
| `animation/indication.py`               | Indicate, Flash, PassingFlash, Wiggle                             | Composition + per-vertex stroke width (needs `Line2` width patch)                      | 🟡   |
| `animation/movement.py`                 | Homotopy, PhaseFlow, MoveAlongPath                                | Per-point function apply; RK integration; curve sampling                               | 🟡   |
| `animation/rotation.py`                 | Rotating, Rotate                                                  | Quaternion/matrix; reset-then-rotate                                                   | 🟢   |
| `animation/numbers.py`                  | ChangingDecimal, CountInFrom                                      | Value lerp + text update                                                               | 🟢   |
| `animation/transform_matching_parts.py` | Match shapes/strings, fade rest                                   | Composition; `SequenceMatcher`→JS LCS                                                  | 🟡   |
| `animation/update.py`                   | UpdateFromFunc/Alpha, MaintainPosition                            | User-callback per frame                                                                | 🟢   |
| `animation/specialized.py`              | Broadcast                                                         | Composition                                                                            | 🟢   |

## Scene, camera, rendering

| Source                       | Role                                                              | Adaptation                                                                                | Risk |
| ---------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| `scene/scene.py`             | **Scene**: play/wait/update loop, render groups, add/remove, undo | Async rAF driver (doc 01); `assemble_render_groups`→batching; `get/restore_state`→clone   | 🔴   |
| `scene/interactive_scene.py` | On-screen selection/manipulation                                  | Raycaster + transform gizmos; later stage                                                 | 🟡   |
| `scene/scene_embed.py`       | IPython embed, reload, checkpoint_paste                           | **Replace** with live editor + HMR (doc 05)                                               | 🔴   |
| `scene/scene_file_writer.py` | ffmpeg pipe                                                       | **Replace** with WebCodecs/MediaRecorder                                                  | 🟡   |
| `camera/camera.py`           | GL capture/FBO/uniforms                                           | `ThreeRenderer` + `OrthographicCamera` + render targets                                   | 🟡   |
| `camera/camera_frame.py`     | Frame as a Mobject (pose/zoom)                                    | Mobject controlling the Three camera                                                      | 🟡   |
| `window.py`                  | Pyglet window/events                                              | Canvas + DOM events + resize                                                              | 🟢   |
| `shaders/**/*.glsl` (28)     | GPU programs                                                      | Mostly superseded by native objects; a few ported as fallbacks (winding, glow, stroke-AA) | 🟡   |

## SVG / Tex / Text (`mobject/svg/`)

| Source                                             | Role                                   | Adaptation                                                               | Risk |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ | ---- |
| `mobject/svg/svg_mobject.py`                       | SVG → VMobject paths                   | **`SVGLoader`** → `ShapePath`→`Shape`/`Line2`                            | 🟡   |
| `mobject/svg/tex_mobject.py`                       | LaTeX → SVG → VMobject + color map     | MathJax/KaTeX → `SVGLoader`; submobject/color labels                     | 🔴   |
| `mobject/svg/string_mobject.py`                    | Substring isolation/coloring base      | Color-label scheme via DOM classes; `scipy` Hungarian→JS assignment      | 🔴   |
| `mobject/svg/text_mobject.py`                      | **Pango** text/markup                  | **Replace**: opentype.js outlines→`Shape`, or troika for labels          | 🔴   |
| `mobject/svg/special_tex.py`, `old_tex_mobject.py` | Legacy Tex                             | Map onto new Tex; drop deprecated                                        | 🟡   |
| `mobject/svg/brace.py`                             | Braces (Tex-based)                     | Depends on Tex; geometry simple                                          | 🟢   |
| `mobject/svg/drawings.py`                          | Composite icons (bulb, bubble, piano…) | Compose primitives; SVG assets via `SVGLoader`; boolean ops via paper.js | 🟡   |
| `mobject/boolean_ops.py`                           | **skia-pathops** union/diff/intersect  | **Replace** with paper.js / JS path-boolean                              | 🔴   |

## Geometry, coordinates, numbers, 3D, fields

| Source                          | Role                                               | Adaptation                                                             | Risk |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| `mobject/geometry.py`           | Line, Circle, Arc, Polygon, Rectangle, Arrow, tips | VMobject path builders (native `Shape`/curves); pure math              | 🟡   |
| `mobject/coordinate_systems.py` | Axes, NumberPlane, c2p/p2c                         | Pure-math abstraction; axes via Line/grid                              | 🟢   |
| `mobject/number_line.py`        | Number line, ticks, labels                         | Line + ticks + DecimalNumber                                           | 🟢   |
| `mobject/numbers.py`            | DecimalNumber/Integer                              | Per-digit text mobjects; layout                                        | 🟡   |
| `mobject/matrix.py`             | Matrix layout + brackets                           | Grid layout + bracket shapes                                           | 🟢   |
| `mobject/three_dimensions.py`   | Sphere, Cube, Torus, etc.                          | `ParametricGeometry`/native geometries                                 | 🟢   |
| `mobject/functions.py`          | ParametricCurve, FunctionGraph, ImplicitFunction   | Sample to curve; implicit via JS marching squares (`isosurfaces` port) | 🟡   |
| `mobject/vector_field.py`       | Vector fields, streamlines                         | Arrow glyphs; ODE via RK4 (`scipy.solve_ivp` replacement)              | 🟡   |
| `mobject/shape_matchers.py`     | SurroundingRectangle, Underline, Cross             | Compose geometry                                                       | 🟢   |
| `mobject/probability.py`        | SampleSpace, BarChart                              | Compose geometry                                                       | 🟢   |
| `mobject/frame.py`              | Screen-frame helpers                               | Pure port                                                              | 🟢   |

---

## Risk roll-up

- 🔴 **High (the project's real work)** — `mobject.py`, `vectorized_mobject.py`, `shader_wrapper.py`/renderer, `transform.py` (`align_data_and_family`), `scene.py`, `tex_file_writing`→MathJax, `tex_mobject.py`, `string_mobject.py`, `text_mobject.py`→opentype, `boolean_ops.py`→paper.js, `module_loader`/`scene_embed`→live editor.
- 🟡 **Medium** — animation base + several animations, geometry, surfaces, SVGLoader plumbing, camera/FBO, config store, bezier helpers.
- 🟢 **Low (bulk of the LOC, little risk)** — most utils, rate functions, coordinate systems, number/matrix/3D mobjects, composition, fades, growth, updates.

The pattern: **~12 hard files gate the project; the other ~75 are volume, not risk.** Stages (doc 04) are sequenced so the hard files come early and everything else parallelizes behind them.
