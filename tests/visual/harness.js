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
  Sphere,
  Torus,
  Cube,
  Cylinder,
  Cone,
  Line3D,
  Disk3D,
  SurfaceMesh,
  DotCloud,
  GlowDots,
  ImageMobject,
  VectorField,
  StreamLines,
  Matrix,
  Brace,
  BarChart,
  SampleSpace,
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
  texcolor: () => [
    new Tex('x^2 + 2xy + y^2', {
      color: '#FFFFFF',
      texToColorMap: { x: '#FC6255', y: '#58C4DD' },
    }).scale(1.4),
  ],
  text: () => [new Text('kty', { color: '#58C4DD' }).scale(1.6)],
  decimal: () => {
    const label = new Tex('x =', { color: '#888888' }).scale(1.6).shift([-1.5, 0, 0]);
    const value = new DecimalNumber(3.14, { numDecimalPlaces: 2, color: '#FFFF00' })
      .scale(1.6)
      .shift([1, 0, 0]);
    return [label, value];
  },
  // 3D scenes: a reorient turns the camera perspective (Mesh path + lights).
  sphere: () => ({
    mobjects: [new Sphere({ radius: 2, color: '#58C4DD' })],
    reorient: [-30, 70],
  }),
  torus: () => ({
    mobjects: [new Torus({ r1: 2, r2: 0.8, color: '#FC6255' })],
    reorient: [-30, 70],
  }),
  cube: () => ({
    mobjects: [new Cube({ sideLength: 2.4, color: '#83C167' })],
    reorient: [-40, 75],
  }),
  surfacemesh: () => {
    // Lower-res torus + fewer mesh lines so the frame settles under CI's GL.
    const torus = new Torus({ r1: 2, r2: 0.8, resolution: [48, 24], color: '#2A4858' });
    const mesh = new SurfaceMesh(torus, {
      resolution: [16, 8],
      strokeColor: '#7AD151',
      strokeWidth: 1.5,
    });
    return { mobjects: [torus, mesh], reorient: [-30, 70] };
  },
  solids3d: () => ({
    mobjects: [
      new Cylinder({ radius: 0.8, height: 2.2, color: '#58C4DD' }).shift([-3.2, 0, 0]),
      new Cone({ radius: 1, height: 2, color: '#FC6255' }).shift([-0.5, -1, 0]),
      new Disk3D({ radius: 1.1, color: '#FFFF00' }).shift([2.4, 0.2, 0]),
      new Line3D({ start: [-4, -1.7, 0], end: [4, -1.7, 0], width: 0.12, color: '#83C167' }),
    ],
    reorient: [-25, 70],
  }),
  dots: () => {
    const cols = 21;
    const rows = 11;
    const pts = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        pts.push([(i - (cols - 1) / 2) * 0.45, (j - (rows - 1) / 2) * 0.45, 0]);
      }
    }
    const dc = new DotCloud({ points: pts, radius: 0.12 });
    dc.setColorByGradient('#58C4DD', '#FC6255');
    return { mobjects: [dc] };
  },
  glow: () => {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (TAU * i) / 12;
      pts.push([Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0]);
    }
    pts.push([0, 0, 0]);
    return { mobjects: [new GlowDots({ points: pts, radius: 0.5, color: '#FFFF00' })] };
  },
  image: () => {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    const ctx = cv.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, '#58C4DD');
    grd.addColorStop(1, '#83C167');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#FC6255';
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(18, 18, 22, 22);
    return { mobjects: [new ImageMobject(cv, { height: 4.5 })] };
  },
  vectorfield: () => {
    const plane = new NumberPlane({ xRange: [-6, 6, 1], yRange: [-3.5, 3.5, 1] });
    plane.setStroke('#3C5A6E', 1, 0.4);
    const vf = new VectorField({
      func: (x, y) => [-y * 0.7, x * 0.7],
      coordinateSystem: plane,
      density: 1,
      strokeWidth: 4,
    });
    return { mobjects: [plane, vf] };
  },
  taperstroke: () => {
    // Per-vertex stroke: width ramps 0→thick along the curve, color gradient
    // blue→red across it. Exercises the tapered/gradient render path.
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = -5 + (10 * i) / 24;
      pts.push([x, 1.4 * Math.sin((x * Math.PI) / 2.5), 0]);
    }
    const wave = new VMobject().setPointsSmoothly(pts).shift([0, 1.4, 0]);
    wave.setStroke(['#58C4DD', '#FC6255'], [0, 14], 1);
    // A second curve with a single mid-band of width (gaussian-ish bump).
    const pts2 = [];
    const widths = [];
    for (let i = 0; i <= 24; i++) {
      const x = -5 + (10 * i) / 24;
      pts2.push([x, 0, 0]);
      const d = (i - 12) / 6;
      widths.push(12 * Math.exp(-d * d));
    }
    const band = new VMobject().setPointsAsCorners(pts2).shift([0, -1.6, 0]);
    band.setStroke('#FFFF00', widths, 1);
    return { mobjects: [wave, band] };
  },
  smoothing: () => {
    // A smooth curve through anchors (setPointsSmoothly) + a rounded square.
    const wave = new VMobject()
      .setPointsSmoothly([
        [-5, 0, 0],
        [-2.5, 1.4, 0],
        [0, 0, 0],
        [2.5, -1.4, 0],
        [5, 0, 0],
      ])
      .setStroke('#58C4DD', 5, 1)
      .shift([0, 1.4, 0]);
    const rsq = new Square({ sideLength: 2.4, fillColor: '#FC6255', fillOpacity: 1 }).shift([
      0, -1.7, 0,
    ]);
    rsq.roundCorners(0.55);
    return { mobjects: [wave, rsq] };
  },
  brace: () => {
    const expr = new Tex('a + b + c', { color: '#FFFFFF' }).scale(1.5);
    const brace = new Brace(expr, { direction: [0, -1, 0] }).setColor('#58C4DD');
    const label = brace.getText('sum', { color: '#FC6255' });
    return { mobjects: [expr, brace, label] };
  },
  matrix: () => {
    const m = new Matrix(
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      { elementConfig: { color: '#FFFFFF' } }
    ).scale(1.3);
    m.setColumnColors('#58C4DD', '#FC6255', '#83C167');
    return { mobjects: [m] };
  },
  barchart: () => {
    const chart = new BarChart({
      values: [0.3, 0.7, 0.5, 0.9, 0.4],
      maxValue: 1,
      width: 6,
      height: 3.4,
      barNames: ['a', 'b', 'c', 'd', 'e'],
      barColors: ['#58C4DD', '#FC6255'],
    }).scale(1.1);
    return { mobjects: [chart] };
  },
  samplespace: () => {
    const ss = new SampleSpace({ width: 3.4, height: 3.4 });
    ss.divideHorizontally([0.5]);
    ss.horizontalParts.submobjects[0].divideVertically([0.3]);
    ss.horizontalParts.submobjects[1].divideVertically([0.6]);
    return { mobjects: [ss] };
  },
  streamlines: () => {
    // Light (≈28 lines × 35 steps, no background grid) so the frame renders fast
    // enough under CI's software GL to settle within the screenshot window.
    const axes = new Axes({ xRange: [-6, 6, 1], yRange: [-3.5, 3.5, 1] });
    axes.setStroke('#33414C', 1, 0);
    const sl = new StreamLines({
      func: (x, y) => [Math.cos(y), Math.sin(x)],
      coordinateSystem: axes,
      density: 0.5,
      nSteps: 35,
      dt: 0.07,
      strokeWidth: 2,
    });
    return { mobjects: [sl] };
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
  const def = build();
  // Scenes are either a flat mobject array (2D) or { mobjects, reorient } (3D).
  const isObj = !Array.isArray(def);
  const mobjects = isObj ? def.mobjects : def;
  if (isObj && def.reorient) {
    renderer.camera.getFrame().reorient(def.reorient[0], def.reorient[1]);
  }
  // 2D stays VGroup-wrapped (unchanged); 3D mobjects render directly.
  const renderList = isObj ? mobjects : [new VGroup(...mobjects)];
  function frame() {
    renderer.render(renderList);
    requestAnimationFrame(frame);
  }
  frame();
  window.__ktyReady = true;
} catch (e) {
  window.__ktyError = e.message;
  document.title = 'ERROR: ' + e.message;
  console.error(e);
}
