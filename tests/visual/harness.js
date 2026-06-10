// Deterministic single-frame scenes for visual-regression testing.
// Loaded by Playwright at /tests/visual/index.html?scene=<id>. Each scene is
// static (no time/animation) so the rendered frame is reproducible. We re-render
// every animation frame so the canvas always shows the latest frame when
// Playwright screenshots it (no preserveDrawingBuffer needed).

import * as kty from '../../src/index.js';

const {
  ThreeRenderer,
  VMobject,
  VGroup,
  Circle,
  Square,
  Triangle,
  RegularPolygon,
  Dot,
  Arrow,
  Axes,
  NumberPlane,
  Tex,
  Text,
  DecimalNumber,
  TAU,
} = kty;

const W = 480;
const H = 270;

function star() {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = (TAU * i) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? 2.2 : 0.9;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  return new VMobject().setPointsAsCorners(pts).setFill('#FFFF00', 0.9).setStroke('#F4D345', 5, 1);
}

function squiggle() {
  const vm = new VMobject();
  vm.startNewPath([-3, 0, 0]);
  for (let i = 0; i < 6; i++) {
    vm.addQuadraticBezierCurveTo([-3 + i + 0.5, i % 2 ? 1.6 : -1.6, 0], [-3 + i + 1, 0, 0]);
  }
  return vm.setStroke('#FFFFFF', 6, 1);
}

export const SCENES = {
  circle: () => [
    new Circle({
      radius: 2,
      fillColor: '#58C4DD',
      fillOpacity: 1,
      strokeColor: '#C7E9F1',
      strokeWidth: 4,
    }),
  ],
  square: () => [new Square({ sideLength: 3, fillColor: '#FC6255', fillOpacity: 1 })],
  triangle: () => [new Triangle({ fillColor: '#83C167', fillOpacity: 1 }).scale(2)],
  pentagon: () => [new RegularPolygon({ n: 5, radius: 2, strokeColor: '#FFFF00', strokeWidth: 5 })],
  star: () => [star()],
  squiggle: () => [squiggle()],
  shapes: () => [
    new Circle({ radius: 1, fillColor: '#58C4DD', fillOpacity: 1 }).shift([-4, 0, 0]),
    new Square({ sideLength: 1.8, fillColor: '#FC6255', fillOpacity: 0.85 }).shift([-1, 0, 0]),
    new Triangle({ fillColor: '#83C167', fillOpacity: 1 }).scale(1.2).shift([2, 0, 0]),
    new Arrow({ start: [3.5, -1.5, 0], end: [5.5, -1.5, 0] }),
    new Dot({ point: [-1, 0, 0], fillColor: '#FFFFFF' }),
  ],
  axes: () => {
    const ax = new Axes({ xRange: [-3, 3, 1], yRange: [-2, 2, 1] });
    ax.addCoordinateLabels();
    const g = ax.getGraph((x) => 0.4 * x * x - 1).setStroke('#FC6255', 4, 1);
    return [ax, g];
  },
  plane: () => [new NumberPlane({ xRange: [-5, 5, 1], yRange: [-3, 3, 1] })],
  tex: () => [new Tex('e^{i\\pi} + 1 = 0', { color: '#FFFFFF' }).scale(1.5)],
  text: () => [new Text('kty', { color: '#58C4DD' }).scale(1.6)],
  decimal: () => {
    const label = new Tex('x =', { color: '#888888' }).scale(1.6).shift([-1.5, 0, 0]);
    const value = new DecimalNumber(3.14, { numDecimalPlaces: 2, color: '#FFFF00' })
      .scale(1.6)
      .shift([1, 0, 0]);
    return [label, value];
  },
};

const id = new URLSearchParams(location.search).get('scene') || 'circle';
const canvas = document.getElementById('stage');
canvas.width = W;
canvas.height = H;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';

try {
  const renderer = new ThreeRenderer({ width: W, height: H }).attach(canvas);
  const build = SCENES[id];
  if (!build) throw new Error(`unknown scene: ${id}`);
  const mobjects = build();
  const group = new VGroup(...mobjects);
  function frame() {
    renderer.render([group]);
    requestAnimationFrame(frame);
  }
  frame();
  window.__ktyReady = true;
} catch (e) {
  window.__ktyError = e.message;
  document.title = 'ERROR: ' + e.message;
  console.error(e);
}
