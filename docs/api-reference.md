# kty API reference

The public API of **`@viesar/kty`** — everything importable from the package
root. Grouped by area. Constructors take a single options object unless noted;
all options and methods are `camelCase`.

```js
import { ThreeRenderer, Circle, Tex, Transform, BLUE, UP } from '@viesar/kty';
```

New to the engine? Start with the [migration guide](./migration-guide.md). For
the conceptual model (mobjects, the family tree, the data arrays), see
[`docs/01-target-architecture.md`](./01-target-architecture.md) and
[`docs/02-rendering-strategy.md`](./02-rendering-strategy.md).

## Contents

- [Rendering & scene](#rendering--scene)
- [Core mobjects](#core-mobjects)
- [2D geometry](#2d-geometry)
- [Text & Tex](#text--tex)
- [Numbers & matrices](#numbers--matrices)
- [Coordinate systems & graphs](#coordinate-systems--graphs)
- [3D: surfaces & solids](#3d-surfaces--solids)
- [Point clouds & images](#point-clouds--images)
- [Vector fields](#vector-fields)
- [Boolean operations](#boolean-operations)
- [Probability](#probability)
- [Drawings](#drawings)
- [Animations](#animations)
- [Value trackers](#value-trackers)
- [Colors & constants](#colors--constants)
- [Export & web](#export--web)
- [Math & utility functions](#math--utility-functions)

---

## Rendering & scene

| Symbol                                                              | Purpose                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThreeRenderer({ width, height, camera?, preserveDrawingBuffer? })` | The WebGL2 renderer. `.attach(canvas)` creates the GL context; `.render(mobjects)` draws an ordered mobject list; `.setSize(w, h)`, `.observeResize(el)`. Caches built geometry per mobject (rebuilds only on data change). |
| `Scene({ fps? })`                                                   | Headless orchestration: `add`/`remove`/`clear`, `await play(...anims)`, `await wait(seconds)`, `getState`/`restoreState`. Override `tick(dt)` to render in a browser (see migration guide).                                 |
| `Camera`, `CameraFrame`                                             | The view. `renderer.camera.getFrame().reorient(theta, phi, gamma?)` orients a 3D camera (degrees, `zxz` Euler); ortho for 2D, perspective for 3D.                                                                           |
| `RenderBackend`                                                     | Abstract base for renderers; `assembleRenderGroups(mobjects)` flattens a list to draw-ordered members.                                                                                                                      |

```js
const renderer = new ThreeRenderer({ width: 1280, height: 720 }).attach(canvas);
renderer.observeResize(canvas.parentElement); // keep aspect on container resize
renderer.render([circle, square]);
```

## Core mobjects

| Symbol                                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mobject`                                           | Base class for everything drawable. Holds `data` (a structured `MobjectData` array) + `submobjects` (the family tree). Transforms: `shift`, `scale`, `rotate`, `flip`, `moveTo`, `nextTo`, `alignTo`, `toEdge`, `center`. Style/queries: `setColor`, `setOpacity`, `getCenter`, `getWidth`/`getHeight`/`getDepth`, `getBoundingBoxPoint`. Tree: `add`, `remove`, `getFamily`. Updaters: `addUpdater((m, dt) => …)`, `update`, `clearUpdaters`. Depth: `applyDepthTest()`. Fluent animation: `mob.animate.<methods>().build()` (manim's `.animate` sugar). Lifecycle: `copy`, `become`, `saveState`/`restore`. |
| `VMobject`                                          | Vectorized mobject (quadratic-bézier paths) — the base for most shapes. Stroke/fill: `setStroke(color, width, opacity)` (width/color may be **arrays** for per-vertex taper/gradient), `setFill(color, opacity)`, `matchStyle`. Path: `setPointsAsCorners`, `startNewPath`, `addLineTo`, `addQuadraticBezierCurveTo`, `getSubpaths`, `reversePoints`, `pointFromProportion`. Smoothing: `setPointsSmoothly`, `makeSmooth`, `makeJagged`.                                                                                                                                                                      |
| `VGroup(...mobjects)`                               | A `VMobject` group; variadic. `arrange(direction, buff)`, indexable via `.submobjects`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Group(...mobjects)`, `PGroup`, `PMobject`, `Point` | Generic / point-cloud groupings and a zero-size point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `MobjectData`                                       | The structured-array backing store (columns like `point`, `stroke_rgba`, `stroke_width`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 2D geometry

All extend `VMobject`. Common options: `fillColor`, `fillOpacity`, `strokeColor`,
`strokeWidth`, `strokeOpacity`, `color`.

| Symbol                                                              | Key options                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Arc`                                                               | `{ startAngle, angle, radius, arcCenter }`                                |
| `ArcBetweenPoints`                                                  | `{ start, end, angle }`                                                   |
| `Circle`                                                            | `{ radius, startAngle }`; `pointAtAngle(a)`                               |
| `Ellipse`                                                           | `{ width, height }`                                                       |
| `Dot`, `SmallDot`, `TrueDot`                                        | `{ point, radius }`                                                       |
| `AnnularSector`                                                     | `{ innerRadius, outerRadius, startAngle, angle, arcCenter }`              |
| `Sector`                                                            | `{ radius, angle }` (pie wedge)                                           |
| `Annulus`                                                           | `{ innerRadius, outerRadius }` (ring)                                     |
| `Line`, `DashedLine`                                                | `{ start, end, buff, pathArc }`; `getLength`, `getAngle`, `getUnitVector` |
| `Arrow`, `Vector`, `ArrowTip`                                       | `{ start, end, … }` arrows with a tip                                     |
| `Polygon`, `Polyline`, `RegularPolygon`, `Triangle`                 | `{ vertices }` / `{ n, radius }`; `roundCorners(r)`                       |
| `Square`, `Rectangle`, `RoundedRectangle`                           | `{ sideLength }` / `{ width, height, cornerRadius }`                      |
| `SurroundingRectangle`, `BackgroundRectangle`, `Underline`, `Cross` | shape-matchers built around another mobject                               |
| `compassDirections(n, startVect)`                                   | helper: `n` directions around the circle                                  |

## Text & Tex

| Symbol                                                                   | Purpose                                                                                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Tex(tex, { fontSize, color, texToColorMap })`                           | LaTeX via MathJax. `getPart(sub, i?)` / `getParts(sub)` select glyph runs; `setColorByTex(sub, color)`, `setColorByTexToColorMap(map)`. |
| `TexText(text, opts)`                                                    | Text in LaTeX text-mode.                                                                                                                |
| `Text(text, { fontSize, color })`                                        | Plain (non-LaTeX) text via opentype.                                                                                                    |
| `TexTextFromPresetString`                                                | Base class: subclass sets a static `tex`.                                                                                               |
| `BulletedList(...items, { numbered, buff, alignedEdge })`                | Vertical list with bullet/number markers; `fadeAllBut(i)`.                                                                              |
| `Title(text, { fontSize, includeUnderline, matchUnderlineWidthToText })` | Heading pinned to the top with an optional underline.                                                                                   |
| `Brace(mobject, { direction })`, `BraceLabel`, `BraceText`               | A brace spanning a mobject, with optional label.                                                                                        |
| `SVGMobject`, `VMobjectFromSVGPath`                                      | Build a VMobject from an SVG path / document.                                                                                           |

```js
new Tex('x^2 + 2xy + y^2', { texToColorMap: { x: '#FC6255', y: '#58C4DD' } });
```

## Numbers & matrices

| Symbol                                                                               | Purpose                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `DecimalNumber(value, { numDecimalPlaces, color })`, `Integer`                       | A live numeric label.                                               |
| `Matrix(rows, { elementConfig })`, `IntegerMatrix`, `DecimalMatrix`, `MobjectMatrix` | Bracketed matrices; `setColumnColors(...)`, `getRows`/`getColumns`. |
| `ChangingDecimal`, `ChangeDecimalToValue`, `CountInFrom`                             | Animations that drive a `DecimalNumber`.                            |

## Coordinate systems & graphs

| Symbol                                                                                 | Purpose                                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `NumberLine({ xRange, … })`                                                            | A number line; `numberToPoint`, `pointToNumber`, `addNumbers`.                                              |
| `Axes({ xRange, yRange })`                                                             | 2D axes; `addCoordinateLabels()`, `getGraph(fn, { xRange })`, `c2p`/`coordsToPoint`, `p2c`/`pointToCoords`. |
| `NumberPlane({ xRange, yRange })`                                                      | Axes + background grid.                                                                                     |
| `FunctionGraph(fn, { xRange })`, `ParametricCurve(fn, { tRange })`, `ImplicitFunction` | Graphs of functions / parametric / implicit curves.                                                         |

## 3D: surfaces & solids

3D needs a reoriented camera frame (`renderer.camera.getFrame().reorient(…)`);
lights are added automatically when a 3D mobject is present.

| Symbol                                                                | Purpose                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Surface`, `ParametricSurface(uvFunc, opts)`                          | Parametric `uv` surface (smooth-shaded mesh).              |
| `Sphere`, `Torus`, `Cylinder`, `Cone`, `Disk3D`, `Square3D`, `Line3D` | Surface-based primitives.                                  |
| `Cube`, `Prism`                                                       | Surface-based box.                                         |
| `SurfaceMesh(surface, { resolution })`                                | Wireframe of a surface's uv grid.                          |
| `TexturedSurface(surface, imageSrc, { darkImageSrc })`                | Map an image onto a surface; `setImageCoordsByUvFunc(fn)`. |
| `VCube`, `VPrism`, `Dodecahedron`, `VGroup3D`                         | VMobject-based depth-tested solids (flat faces).           |
| `Prismify(vmobject, { depth, direction })`                            | Extrude a flat VMobject into a prism.                      |

## Point clouds & images

| Symbol                                           | Purpose                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `DotCloud({ points, radius })`                   | A cloud of dots (`THREE.Points`); `setColorByGradient(...)`.      |
| `GlowDot`, `GlowDots({ points, radius, color })` | Additive-glow points.                                             |
| `ImageMobject(src, { height, width })`           | An image (`src`: URL / `HTMLImageElement` / `HTMLCanvasElement`). |

## Vector fields

| Symbol                                                          | Purpose                                |
| --------------------------------------------------------------- | -------------------------------------- |
| `VectorField({ func, coordinateSystem, density, strokeWidth })` | Arrows sampling `func(x, y) → [u, v]`. |
| `StreamLines({ func, coordinateSystem, density, nSteps, dt })`  | Integrated flow lines of a field.      |

## Boolean operations

Path-boolean on 2D VMobjects (béziers are flattened, clipped, rebuilt).

| Symbol                              | Purpose                     |
| ----------------------------------- | --------------------------- |
| `Union(...vmobjects, opts?)`        | Combined outline.           |
| `Intersection(...vmobjects, opts?)` | Overlapping region.         |
| `Difference(subject, clip, opts?)`  | Subject minus clip.         |
| `Exclusion(...vmobjects, opts?)`    | Symmetric difference (xor). |

## Probability

| Symbol                                                | Purpose                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `BarChart({ values, maxValue, barNames, barColors })` | Labelled bar chart; `changeBarValues(values)`.                                         |
| `SampleSpace({ width, height })`                      | A unit square split into probability strips: `divideHorizontally`, `divideVertically`. |

## Drawings

| Symbol                                             | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `Checkmark`, `Exmark`                              | A drawn check / cross (stroke paths).     |
| `Clock`, `ClockPassesTime(clock, { hoursPassed })` | A clock face + a hand-rotation animation. |
| `DieFace(value, { sideLength, … })`                | A die showing 1–6 pips.                   |
| `Dartboard({ radius, nSectors })`                  | Concentric scoring rings + bullseye.      |

## Animations

Each is a class wrapping a target mobject with `begin()` / `interpolate(alpha)` /
`finish()`. Common options: `runTime`, `rateFunc`, `lagRatio`, `remover`. Play
through `Scene.play`, or step `alpha` manually.

**Creation:** `ShowCreation`, `Create`, `Uncreate`, `Write`, `DrawBorderThenFill`,
`ShowPartial`.

**Fading:** `FadeIn`, `FadeOut`, `FadeInFromPoint`, `FadeOutToPoint`, `FadeToColor`.

**Growing:** `GrowFromPoint`, `GrowFromCenter`, `GrowFromEdge`, `GrowArrow`,
`SpinInFromNothing`, `ShrinkToCenter`.

**Transform:** `Transform`, `ReplacementTransform`, `TransformFromCopy`,
`MoveToTarget`, `ApplyMethod`, `Rotate`, `ScaleInPlace`, `Restore`,
`TransformMatchingShapes`, `TransformMatchingTex`, `TransformMatchingParts`.

**Indication:** `Indicate`, `FocusOn`, `CircleIndicate`, `Flash`, `FlashAround`,
`FlashUnder`, `WiggleOutThenIn`, `ApplyWave`, `TurnInsideOut`, `ShowPassingFlash`,
`VShowPassingFlash`, `ShowCreationThenDestruction`, `ShowCreationThenFadeOut`,
`ShowCreationThenDestructionAround`, `ShowCreationThenFadeAround`, `Broadcast`.

**Movement:** `MoveAlongPath`, `Homotopy`, `ComplexHomotopy`, `PhaseFlow`,
`MaintainPositionRelativeTo`.

**Rotation:** `Rotating`, `Rotate`.

**Update:** `UpdateFromFunc`, `UpdateFromAlphaFunc`.

**Composition:** `AnimationGroup(...anims, opts)`, `Succession(...anims)`,
`LaggedStart(...anims, { lagRatio })`.

```js
await scene.play(new LaggedStart(new FadeIn(a), new FadeIn(b), new FadeIn(c), { lagRatio: 0.2 }));
```

## Value trackers

| Symbol                                           | Purpose                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `ValueTracker(value)`                            | A drivable scalar: `getValue()`, `setValue(v)`, `incrementValue(dv)`. Combine with `addUpdater` to bind a mobject to it. |
| `ComplexValueTracker`, `ExponentialValueTracker` | Complex-valued / exponentially-interpolating trackers.                                                                   |

## Colors & constants

**Palette** (hex strings): `BLUE`, `TEAL`, `GREEN`, `YELLOW`, `GOLD`, `ORANGE`,
`RED`, `MAROON`, `PURPLE`, `PINK`, `WHITE`, `BLACK`, `GREY` (+ `COLORS`,
`COLORMAPS`, `FIELD_COLORS`).

**Directions** (`[x, y, z]` arrays): `ORIGIN`, `UP`, `DOWN`, `LEFT`, `RIGHT`,
`IN`, `OUT`, `UL`, `UR`, `DL`, `DR`, `TOP`, `BOTTOM`, `LEFT_SIDE`, `RIGHT_SIDE`,
`X_AXIS`, `Y_AXIS`, `Z_AXIS`.

**Angles & frame:** `PI`, `TAU`, `DEGREES`, `RADIANS`, `FRAME_WIDTH`,
`FRAME_HEIGHT`, `FRAME_X_RADIUS`, `FRAME_Y_RADIUS`, `ASPECT_RATIO`.

**Buffers:** `SMALL_BUFF`, `MED_SMALL_BUFF`, `MED_LARGE_BUFF`, `LARGE_BUFF`,
`DEFAULT_MOBJECT_TO_MOBJECT_BUFF`, `DEFAULT_MOBJECT_TO_EDGE_BUFF`.

**Color helpers:** `colorToRgb`, `rgbToHex`, `hexToRgb`, `interpolateColor`,
`colorGradient`, `averageColor`, `invertColor`, `hsl`, `getColormap`,
`getColormapColors`.

**Config:** `config`, `ConfigStore`, `DEFAULT_CONFIG`, `DEFAULT_FPS`,
`DEFAULT_PIXEL_WIDTH`, `DEFAULT_PIXEL_HEIGHT`.

## Export & web

| Symbol                                                                      | Purpose                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `toSVG(mobjects, opts)`                                                     | Serialize mobjects to an SVG string.                                                 |
| `downloadSVG(mobjects, filename)`                                           | Build + download an SVG file.                                                        |
| `toDataURL(renderer, mobjects?, opts)`, `toBlob(renderer, mobjects?, opts)` | Capture the rendered frame as a PNG data URL / blob.                                 |
| `downloadImage(renderer, filename?, mobjects?, opts)`                       | Download the rendered frame as a PNG.                                                |
| `defineKtyScene()`, `KtyScene`                                              | Register the `<kty-scene>` web component.                                            |
| `EventDispatcher`                                                           | Route pointer events (click/hover) to mobjects (`dispatchToMobject`, `findMobject`). |
| `observeResize`, `toggleFullscreen`                                         | Canvas/layout helpers.                                                               |

## Math & utility functions

Rarely needed directly, but exported for advanced use.

**Rate functions** (`alpha → alpha`): `linear`, `smooth`, `rushInto`,
`rushFrom`, `slowInto`, `doubleSmooth`, `thereAndBack`, `thereAndBackWithPause`,
`runningStart`, `overshoot`, `wiggle`, `lingering`, `exponentialDecay`,
`sigmoid`, `squishRateFunc`.

**Interpolation:** `interpolate`, `inverseInterpolate`, `matchInterpolate`,
`integerInterpolate`, `mid`, `clip`, `lerp`.

**Bézier:** `bezier`, `partialBezierPoints`, `partialQuadraticBezierPoints`,
`quadraticBezierPointsForArc`, `approxSmoothQuadraticBezierHandles`,
`getSmoothCubicBezierHandlePoints`.

**Vectors / space:** `getNorm`, `normalize`, `cross`, `dot`, `rotateVector`,
`rotationMatrix`, `angleOfVector`, `angleBetweenVectors`, `zToVector`,
`applyMatrix`, `composeAffine`.

**Geometry / fields:** `marchingSquares`, `vmobjectToShapes`,
`vmobjectToPolylines`, `pathAlongArc`.

**Iterables / arrays:** `listify`, `resizeWithInterpolation`,
`removeListRedundancies`, `adjacentPairs`, `adjacentNTuples`, `choose`,
`batchByProperty`.

---

> This reference is curated by hand and may lag the source. The exported symbol
> list is the source of truth (`src/index.js`); please open a PR if you spot a
> drift.
