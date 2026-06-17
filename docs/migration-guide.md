# manim → kty migration guide

A cheatsheet for porting [ManimGL](https://github.com/3b1b/manim) (3Blue1Brown's
Python engine) scenes to **kty** (`@viesar/kty`), the browser port built on
modern JavaScript + Three.js + WebGL2.

kty keeps manim's mental model — mobjects, the quadratic-bézier `VMobject`, the
mobject family tree, updaters, and the animation system — but adapts the Python
idioms to JavaScript and swaps Cairo/OpenGL rendering for Three.js. Most ports
are mechanical.

> See also the [**API reference**](./api-reference.md) for the full list of
> exported classes, functions, and constants.

---

## 1. The big picture

| manim (Python)                                     | kty (JavaScript)                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A `Scene` subclass with a `construct(self)` method | Build mobjects and call `renderer.render([...])` — or use the `Scene` class for an async `play()` loop (override `tick()` to render) |
| `manimgl file.py SceneName` renders in a window    | Import from `@viesar/kty` into a web page; render to a `<canvas>`                                                                    |
| `self.add(mob)` / `self.play(anim)`                | `renderer.render([mob])`, or `scene.add(mob)` / `await scene.play(anim)`                                                             |
| Writes frames to a movie file                      | Renders live to a canvas (capture/export with the [export helpers](./api-reference.md#export--web))                                  |

### Hello, circle (renderer only — simplest)

**manim**

```python
from manimlib import *

class Hello(Scene):
    def construct(self):
        circle = Circle(radius=2, fill_color=BLUE, fill_opacity=1)
        self.add(circle)
        self.play(ShowCreation(circle))
```

**kty** — the renderer draws a mobject list; you own the loop:

```js
import { ThreeRenderer, Circle } from '@viesar/kty';

const canvas = document.querySelector('canvas');
const renderer = new ThreeRenderer({ width: 1280, height: 720 }).attach(canvas);

const circle = new Circle({ radius: 2, fillColor: '#58C4DD', fillOpacity: 1 });
renderer.render([circle]);
```

### Using `Scene` for `play()` / `wait()`

`Scene` is headless by default (it owns the mobject list and the async
play/wait driver). To render in a browser, subclass it and override `tick()` to
draw a frame and await the next animation frame:

```js
import { Scene, ThreeRenderer, Circle, ShowCreation } from '@viesar/kty';

class BrowserScene extends Scene {
  constructor(canvas, opts) {
    super(opts);
    this.renderer = new ThreeRenderer({ width: canvas.width, height: canvas.height }).attach(
      canvas
    );
  }
  async tick() {
    this.renderer.render(this.getMobjects());
    await new Promise(requestAnimationFrame);
  }
}

const scene = new BrowserScene(canvas);
const circle = new Circle({ radius: 2, fillColor: '#58C4DD', fillOpacity: 1 });
scene.add(circle);
await scene.play(new ShowCreation(circle));
```

---

## 2. Mechanical translation rules

### Constructors take **one options object**

manim mixes positional args and keyword args. kty constructors take a single
`{}` config object (a few take a leading required value first, e.g.
`new DieFace(3, { ... })`, `new Matrix([[1,2]], { ... })`).

```python
Circle(radius=2, stroke_width=4, fill_color=BLUE)      # manim
Line(LEFT, RIGHT, stroke_color=RED)                    # positional start/end
```

```js
new Circle({ radius: 2, strokeWidth: 4, fillColor: '#58C4DD' }); // kty
new Line({ start: LEFT, end: RIGHT, strokeColor: '#FC6255' }); // named
```

### `snake_case` → `camelCase`

Every method, option, and property is camelCased:

| manim                           | kty                           |
| ------------------------------- | ----------------------------- |
| `mob.set_fill(BLUE, opacity=1)` | `mob.setFill('#58C4DD', 1)`   |
| `mob.next_to(other, RIGHT)`     | `mob.nextTo(other, RIGHT)`    |
| `mob.move_to(point)`            | `mob.moveTo(point)`           |
| `mob.shift(UP)`                 | `mob.shift(UP)`               |
| `mob.to_edge(LEFT)`             | `mob.toEdge(LEFT)`            |
| `mob.set_stroke(RED, width=3)`  | `mob.setStroke('#FC6255', 3)` |
| `mob.get_center()`              | `mob.getCenter()`             |
| `mob.add_updater(fn)`           | `mob.addUpdater(fn)`          |
| `VGroup(a, b, c)`               | `new VGroup(a, b, c)`         |

### Points and vectors are plain arrays

`ORIGIN`, `UP`, `RIGHT`, … are exported as `[x, y, z]` arrays. Anywhere manim
takes an `np.array`, kty takes a 3-element array:

```js
import { UP, RIGHT, ORIGIN } from '@viesar/kty';
circle.shift([1, 2, 0]);
circle.shift(UP); // [0, 1, 0]
circle.moveTo(ORIGIN);
```

### Colors are hex strings (named constants still exist)

The palette constants (`BLUE`, `RED`, `YELLOW`, `GREEN`, `GREY`, …) are exported
and resolve to hex strings. Pass any CSS-style hex where manim takes a color.

```js
import { BLUE, YELLOW } from '@viesar/kty';
new Square({ fillColor: BLUE, fillOpacity: 1 });
new Dot({ fillColor: '#FFFF00' });
```

> **Note:** the base palette names (`BLUE`, `RED`, …) are top-level exports. The
> full manim shade scale lives on the `COLORS` object —
> `COLORS.BLUE_E`, `COLORS.GREY_B`, etc. (`import { COLORS } from '@viesar/kty'`).

---

## 3. Animations

Each animation is a class wrapping a target mobject; it defines
`interpolate(alpha)`. Play them through `Scene.play`, or step `alpha` yourself.

**manim**

```python
self.play(Transform(square, circle), run_time=2)
self.play(FadeIn(label), Write(title), lag_ratio=0.1)
```

**kty (with Scene)** — `run_time`/`lag_ratio` are options on the _animation_;
`play` takes animations variadically and runs them together:

```js
await scene.play(new Transform(square, circle, { runTime: 2 }));
// staggered: wrap in LaggedStart (or AnimationGroup with lagRatio)
await scene.play(new LaggedStart(new FadeIn(label), new Write(title), { lagRatio: 0.1 }));
```

**kty (manual loop)** — every animation supports `begin()` / `interpolate(alpha)`
/ `finish()`:

```js
import { Transform, smooth } from '@viesar/kty';
const anim = new Transform(square, circle);
anim.begin();
let t = 0;
(function frame() {
  t = Math.min(t + 0.01, 1);
  anim.interpolate(smooth(t)); // smooth = manim's default rate_func
  renderer.render([square]);
  if (t < 1) requestAnimationFrame(frame);
})();
```

Animation families map one-to-one: `ShowCreation`, `Write`,
`DrawBorderThenFill`, `FadeIn`/`FadeOut`, `GrowFromCenter`, `Transform`,
`ReplacementTransform`, `TransformMatchingTex`, `Indicate`, `Flash`,
`MoveAlongPath`, `Homotopy`, `Rotating`, `LaggedStart`, `Succession`, … See the
[animations section](./api-reference.md#animations) of the reference.

### Updaters

```python
dot.add_updater(lambda m, dt: m.move_to(tracker.get_value() * RIGHT))
```

```js
dot.addUpdater((m, dt) => m.moveTo([tracker.getValue(), 0, 0]));
```

`ValueTracker`, `always_redraw`-style updaters, and `f_always` patterns are
covered by `ValueTracker` + `addUpdater` / `UpdateFromFunc`.

---

## 4. Text and Tex

Tex renders through **MathJax** (not a local LaTeX install), so there's no
`tex_template` step.

```python
Tex(r"e^{i\pi} + 1 = 0")
TexText("Hello")
Text("Hello", font_size=48)
```

```js
new Tex('e^{i\\pi} + 1 = 0'); // note: escape backslashes in JS strings
new TexText('Hello');
new Text('Hello', { fontSize: 48 });
```

Substring isolation / coloring works by matching glyph paths:

```js
new Tex('x^2 + 2xy + y^2', { texToColorMap: { x: '#FC6255', y: '#58C4DD' } });
tex.setColorByTex('x', '#FC6255');
tex.getPart('xy'); // a VGroup of the matching glyphs
```

> **Bundler note:** MathJax's `version.js` references a `PACKAGE_VERSION` global.
> Define it in your bundler (see the [README](../README.md#using-tex-bundler-note)).

---

## 5. 3D scenes

3D works through the camera frame. Instead of manim's `self.camera.frame` moves,
reorient kty's `CameraFrame` (a `zxz` Euler in degrees):

```python
self.play(self.frame.animate.reorient(-30, 70))   # manim
```

```js
renderer.camera.getFrame().reorient(-30, 70); // kty: (theta, phi[, gamma])
renderer.render([new Sphere({ radius: 2, color: '#58C4DD' })]);
```

Surface-based solids (`Sphere`, `Torus`, `Cube`, `Cylinder`, `Cone`,
`Surface`, `TexturedSurface`) and VMobject-based solids (`VCube`,
`Dodecahedron`, `Prismify`) are supported. The renderer adds lights
automatically when a 3D mobject is present.

---

## 6. What's different (web-native additions)

kty adds capabilities manim doesn't have, because it targets the browser:

- **Export** — `toSVG(mobjects)`, `toDataURL`, `toBlob`, `downloadImage`,
  `downloadSVG` (see [Export & web](./api-reference.md#export--web)).
- **`<kty-scene>` web component** — drop an animation into any page declaratively
  (`defineKtyScene`).
- **Pointer events / picking** — `EventDispatcher` routes clicks/hovers to
  mobjects.
- **Per-vertex stroke width and along-stroke color gradients** — `setStroke`
  accepts width/color arrays; powers `TracingTail` tapers and
  `VShowPassingFlash`.

---

## 7. Common gotchas

| Gotcha                                 | Fix                                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Backslashes in Tex strings             | Double them in JS: `'\\pi'`, or use `String.raw`                                                                                         |
| `PACKAGE_VERSION is not defined`       | Define `PACKAGE_VERSION` in your bundler config                                                                                          |
| A color shade like `BLUE_E` is missing | Use an explicit hex string                                                                                                               |
| 3D scene looks flat / unlit            | `reorient` the camera frame; lights are auto-added for 3D mobjects                                                                       |
| Nothing renders                        | Make sure you `render()` after building, and that the canvas has a size                                                                  |
| `Scene.play` renders nothing           | `Scene` is headless — override `tick()` to render + await a frame (the `BrowserScene` pattern), or drive a `ThreeRenderer` loop yourself |

---

## 8. Side-by-side: a small animated scene

**manim**

```python
class Grow(Scene):
    def construct(self):
        sq = Square(side_length=2, fill_color=RED, fill_opacity=1)
        self.play(GrowFromCenter(sq))
        self.play(sq.animate.shift(2 * RIGHT).set_fill(BLUE))
        self.play(Transform(sq, Circle(radius=1.4, fill_color=YELLOW, fill_opacity=1)))
```

**kty** (using the `BrowserScene` from §1):

```js
import { Square, Circle, GrowFromCenter, Transform } from '@viesar/kty';

const scene = new BrowserScene(canvas);
const sq = new Square({ sideLength: 2, fillColor: '#FC6255', fillOpacity: 1 });
scene.add(sq);

await scene.play(new GrowFromCenter(sq));
sq.shift([2, 0, 0]).setFill('#58C4DD');
await scene.play(
  new Transform(sq, new Circle({ radius: 1.4, fillColor: '#FFFF00', fillOpacity: 1 }))
);
```

> kty mirrors manim's `mob.animate.…` sugar with a builder that ends in
> `.build()`:
>
> ```js
> const anim = sq.animate.shift([2, 0, 0]).rotate(Math.PI).scale(0.5).build();
> await scene.play(anim);
> ```
