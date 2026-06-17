# Changelog

All notable changes to **`@viesar/kty`**. This project adheres to
[Semantic Versioning](https://semver.org/).

## 1.0.0 — feature-complete

The library now covers the full ManimGL mobject, animation, and rendering
surface in the browser. `1.0.0` marks feature completeness and the start of a
stable, additive API (breaking changes will bump the major version).

### Added since 0.1.3

- **Probability** — `BarChart` (with `changeBarValues`) and `SampleSpace`
  (`divideHorizontally` / `divideVertically`).
- **Per-vertex stroke** — `setStroke` accepts width/color arrays for tapered and
  along-stroke-gradient strokes; powers `TracingTail` tapering and the new
  `VShowPassingFlash` (gaussian band sweep).
- **VMobject 3D solids** — `VCube`, `VPrism`, `Dodecahedron`, `VGroup3D`,
  `Prismify`, rendered with true depth testing (`Mobject.applyDepthTest`).
- **`TexturedSurface`** — map an image onto any `Surface`.
- **Framing & broadcast** — `ScreenRectangle`, `FullScreenRectangle`,
  `FullScreenFadeRectangle`, and the `Broadcast` animation.
- **Boolean operations** — `Union`, `Difference`, `Intersection`, `Exclusion`
  on 2D VMobjects (via `polygon-clipping`).
- **Composite Tex** — `BulletedList`, `Title`, `TexTextFromPresetString`.
- **Drawings** — `Checkmark`, `Exmark`, `Clock` + `ClockPassesTime`, `DieFace`,
  `Dartboard`, plus the `AnnularSector` / `Sector` / `Annulus` primitives.

### Changed

- **Renderer** — per-mobject geometry caching gated on `_dataHasChanged`, so a
  per-frame re-render only re-triangulates mobjects whose data actually changed;
  removed/replaced geometry and materials are disposed (shared textures kept).
  Fixes memory growth on heavy scenes.
- `VERSION` now tracks the package version (was a stale `'0.0.0'`).

### Docs

- Added the [migration guide](./docs/migration-guide.md) and
  [API reference](./docs/api-reference.md).

### Out of scope (by design)

SVG-asset props (Lightbulb, VideoIcon, VectorizedEarth, Piano), highly
3b1b-specific props (Speedometer, Laptop), the in-editor `interactive.py` UI,
and legacy `old_tex_mobject` are intentionally not ported.

## 0.1.3 and earlier

- **0.1.3** — 3D mesh path (`Surface`/`Sphere`/`Torus`/`Cube`/…), point clouds,
  images, vector fields, coordinate systems, matrices, braces, and the
  `TransformMatching*` family.
- **0.1.2** — Tex/Text fixes (glyph counter holes; upright glyphs) behind the
  visual-regression gate.
- **0.1.1** — upright-Tex fix.
- **0.1.0** — first public release: geometry, the animation system, and the
  Three.js render backend.
