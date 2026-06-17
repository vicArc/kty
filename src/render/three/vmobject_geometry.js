// Adapts a VMobject onto native Three.js objects (docs/02):
//   fill   -> THREE.Shape / ShapeGeometry (earcut triangulation, built in)
//   stroke -> Line2 / LineGeometry / LineMaterial (fat world-unit lines)
// No WebGL context is needed to build these — only to render them.

import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { rgbToHex } from '../../foundation/color.js';

// manim stroke_width is roughly pixels at 1080p; convert to world units so
// Line2 (worldUnits) tracks manim's coordinate system. Tunable at the visual gate.
export const STROKE_WIDTH_TO_WORLD = 8 / 1080;

// Parse the hex as sRGB (THREE converts it to its linear working space). With
// the renderer's sRGB output pass this round-trips back to the intended color,
// matching how manim treats colors. Passing raw 0..1 values would double-brighten.
const hexToThree = (hex) => new THREE.Color(hex);

/** Build a THREE.Shape or THREE.Path from a subpath's anchor/handle quadratics. */
function subpathToCurvePath(sub, PathClass) {
  const path = new PathClass();
  path.moveTo(sub[0][0], sub[0][1]);
  for (let i = 0; i + 2 < sub.length; i += 2) {
    const h = sub[i + 1];
    const a = sub[i + 2];
    path.quadraticCurveTo(h[0], h[1], a[0], a[1]);
  }
  return path;
}

/** Anchor points (every other point) of a subpath as a flat [x,y] polygon. */
function anchorPolygon(sub) {
  const poly = [];
  for (let i = 0; i < sub.length; i += 2) poly.push([sub[i][0], sub[i][1]]);
  return poly;
}

/** Even-odd ray-cast point-in-polygon test. */
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * THREE.Shapes for a VMobject's fill, with inner contours registered as holes.
 *
 * A glyph like `o`/`0`/`e` arrives as several subpaths (an outer contour plus
 * one or more counters). Filling each subpath independently floods the counters
 * solid, so we nest them: a subpath enclosed by an odd number of others is a
 * hole of its immediate (smallest enclosing) container; even-depth subpaths are
 * solid shapes. Containment is by anchor-polygon point-in-polygon, which is
 * winding-independent (matching SVG/font nonzero fills after our y-flip).
 */
export function vmobjectToShapes(vm) {
  const subs = vm.getSubpaths();
  if (subs.length === 0) return [];
  if (subs.length === 1) return [subpathToCurvePath(subs[0], THREE.Shape)];

  const polys = subs.map(anchorPolygon);
  const reps = subs.map((s) => [s[0][0], s[0][1]]);
  const contains = (i, j) => i !== j && pointInPolygon(reps[i][0], reps[i][1], polys[j]);
  const depth = subs.map((_, i) => subs.reduce((d, _s, j) => d + (contains(i, j) ? 1 : 0), 0));

  const shapes = subs.map((s, i) =>
    depth[i] % 2 === 0 ? subpathToCurvePath(s, THREE.Shape) : null
  );
  subs.forEach((s, i) => {
    if (depth[i] % 2 === 0) return; // solid, not a hole
    // immediate parent = the deepest contour that still encloses this one.
    let parent = -1;
    let parentDepth = -1;
    for (let j = 0; j < subs.length; j++) {
      if (contains(i, j) && depth[j] > parentDepth) {
        parent = j;
        parentDepth = depth[j];
      }
    }
    if (parent >= 0 && shapes[parent]) shapes[parent].holes.push(subpathToCurvePath(s, THREE.Path));
  });
  return shapes.filter(Boolean);
}

/** Flat [x,y,z,...] polyline per subpath, sampling each quadratic. */
export function vmobjectToPolylines(vm, samplesPerCurve = 16) {
  const lines = [];
  for (const sub of vm.getSubpaths()) {
    const pos = [sub[0][0], sub[0][1], sub[0][2] ?? 0];
    for (let i = 0; i + 2 < sub.length; i += 2) {
      const a0 = sub[i];
      const h = sub[i + 1];
      const a1 = sub[i + 2];
      for (let s = 1; s <= samplesPerCurve; s++) {
        const t = s / samplesPerCurve;
        const u = 1 - t;
        for (let d = 0; d < 3; d++) {
          pos.push(u * u * a0[d] + 2 * u * t * h[d] + t * t * a1[d]);
        }
      }
    }
    lines.push(pos);
  }
  return lines;
}

/** Each subpath sampled as a closed 3D polygon loop (anchors + bezier samples). */
function vmobjectTo3DLoops(vm, samplesPerCurve = 8) {
  const loops = [];
  for (const sub of vm.getSubpaths()) {
    const loop = [[sub[0][0], sub[0][1], sub[0][2] ?? 0]];
    for (let i = 0; i + 2 < sub.length; i += 2) {
      const a0 = sub[i];
      const h = sub[i + 1];
      const a1 = sub[i + 2];
      for (let s = 1; s <= samplesPerCurve; s++) {
        const t = s / samplesPerCurve;
        const u = 1 - t;
        loop.push([
          u * u * a0[0] + 2 * u * t * h[0] + t * t * a1[0],
          u * u * a0[1] + 2 * u * t * h[1] + t * t * a1[1],
          u * u * (a0[2] ?? 0) + 2 * u * t * (h[2] ?? 0) + t * t * (a1[2] ?? 0),
        ]);
      }
    }
    loops.push(loop);
  }
  return loops;
}

/**
 * Lit, depth-tested fill mesh for a 3D VMobject (VCube/Dodecahedron faces).
 * Triangulates each planar, convex face as a centroid fan using true 3D
 * positions, so faces keep their orientation and occlude one another by depth
 * (unlike the flat xy ShapeGeometry path). Opaque faces write depth.
 */
export function build3DFillMesh(vm) {
  if (vm.getFillOpacity() <= 0) return null;
  const loops = vmobjectTo3DLoops(vm);
  const positions = [];
  for (const loop of loops) {
    // Drop a trailing point coincident with the first (closed loop).
    const pts = loop.slice();
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1], f[2] - l[2]) < 1e-6) pts.pop();
    if (pts.length < 3) continue;
    const c = [0, 0, 0];
    for (const p of pts) for (let d = 0; d < 3; d++) c[d] += p[d] / pts.length;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      positions.push(c[0], c[1], c[2], a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  }
  if (positions.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const opaque = vm.getFillOpacity() >= 1;
  const material = new THREE.MeshStandardMaterial({
    color: hexToThree(vm.getFillColor()),
    side: THREE.DoubleSide,
    transparent: !opaque,
    opacity: vm.getFillOpacity(),
    roughness: 0.75,
    metalness: 0.0,
    depthTest: true,
    depthWrite: opaque,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = vm.zIndex;
  return mesh;
}

/** Filled mesh, or null if the VMobject has no fill. */
export function buildFillMesh(vm) {
  if (vm.getFillOpacity() <= 0) return null;
  const shapes = vmobjectToShapes(vm);
  if (shapes.length === 0) return null;
  const geometry = new THREE.ShapeGeometry(shapes);
  const material = new THREE.MeshBasicMaterial({
    color: hexToThree(vm.getFillColor()),
    transparent: true,
    opacity: vm.getFillOpacity(),
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = vm.zIndex;
  return mesh;
}

/**
 * Sample a subpath (with per-point stroke width + rgba) into flat arrays of
 * positions, per-vertex world-unit widths, and per-vertex linear-rgb colors.
 * Width and color are interpolated linearly across each quadratic, matching the
 * anchor → anchor blend manim applies along a stroke.
 */
function sampleSubpathStroke(sub, samplesPerCurve = 16) {
  const { points, widths, rgbas } = sub;
  const lin = (rgb) => {
    const c = new THREE.Color(rgbToHex(rgb)); // sRGB hex → linear working space
    return [c.r, c.g, c.b];
  };
  const positions = [points[0][0], points[0][1], points[0][2] ?? 0];
  const ws = [widths[0] * STROKE_WIDTH_TO_WORLD];
  const colors = [...lin(rgbas[0])];
  for (let i = 0; i + 2 < points.length; i += 2) {
    const a0 = points[i];
    const h = points[i + 1];
    const a1 = points[i + 2];
    const w0 = widths[i];
    const w1 = widths[i + 2];
    const c0 = lin(rgbas[i]);
    const c1 = lin(rgbas[i + 2]);
    for (let s = 1; s <= samplesPerCurve; s++) {
      const t = s / samplesPerCurve;
      const u = 1 - t;
      for (let d = 0; d < 3; d++) {
        positions.push(u * u * a0[d] + 2 * u * t * h[d] + t * t * a1[d]);
      }
      ws.push((u * w0 + t * w1) * STROKE_WIDTH_TO_WORLD);
      for (let d = 0; d < 3; d++) colors.push(u * c0[d] + t * c1[d]);
    }
  }
  return { positions, widths: ws, colors };
}

// Patch LineMaterial so per-segment-end widths (instanceWidthStart/End) replace
// the single `linewidth` uniform. Three picks start vs end per vertex by
// position.y, so a segment becomes a trapezoid → smooth taper along the stroke.
function applyPerVertexWidth(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float linewidth;',
        'uniform float linewidth;\nattribute float instanceWidthStart;\nattribute float instanceWidthEnd;'
      )
      .replace(
        'float hw = linewidth * 0.5;',
        'float hw = ( position.y < 0.5 ? instanceWidthStart : instanceWidthEnd ) * 0.5;'
      )
      .replace(
        'offset *= linewidth;',
        'offset *= ( position.y < 0.5 ? instanceWidthStart : instanceWidthEnd );'
      );
  };
}

// Attach per-point widths as paired instanced attributes, mirroring how
// LineGeometry expands consecutive points into overlapping segments.
function setLineWidths(geometry, perPointWidths) {
  const n = perPointWidths.length;
  const pairs = new Float32Array(2 * (n - 1));
  for (let i = 0; i < n - 1; i++) {
    pairs[2 * i] = perPointWidths[i];
    pairs[2 * i + 1] = perPointWidths[i + 1];
  }
  const buf = new THREE.InstancedInterleavedBuffer(pairs, 2, 1);
  geometry.setAttribute('instanceWidthStart', new THREE.InterleavedBufferAttribute(buf, 1, 0));
  geometry.setAttribute('instanceWidthEnd', new THREE.InterleavedBufferAttribute(buf, 1, 1));
}

/** Tapered / along-stroke-gradient stroke (per-vertex width + color). */
function buildTaperedStrokeLines(vm, resolution) {
  const group = new THREE.Group();
  for (const sub of vm.getSubpathsWithStroke()) {
    const { positions, widths, colors } = sampleSubpathStroke(sub);
    if (positions.length < 6) continue;
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);
    setLineWidths(geometry, widths);
    const material = new LineMaterial({
      linewidth: 1, // overridden per-vertex by the shader patch
      worldUnits: true,
      vertexColors: true,
      transparent: true,
      opacity: vm.getStrokeOpacity(),
    });
    applyPerVertexWidth(material);
    material.resolution.set(resolution[0], resolution[1]);
    const line = new Line2(geometry, material);
    line.renderOrder = vm.zIndex;
    group.add(line);
  }
  return group.children.length ? group : null;
}

/** Stroke as one Line2 per subpath, grouped; or null if no stroke. */
export function buildStrokeLines(vm, resolution = [1920, 1080]) {
  if (vm.getStrokeOpacity() <= 0) return null;
  // Per-vertex path only when width/color actually varies, so uniform strokes
  // keep their exact existing rendering (and goldens stay byte-stable). Checked
  // before the width guard since a tapered stroke's first vertex may be width 0.
  if (vm.hasVaryingStroke()) return buildTaperedStrokeLines(vm, resolution);
  if (vm.getStrokeWidth() <= 0) return null;
  const polylines = vmobjectToPolylines(vm);
  if (polylines.length === 0) return null;
  const group = new THREE.Group();
  for (const pos of polylines) {
    if (pos.length < 6) continue; // need at least 2 points
    const geometry = new LineGeometry();
    geometry.setPositions(pos);
    const material = new LineMaterial({
      color: hexToThree(vm.getStrokeColor()),
      linewidth: vm.getStrokeWidth() * STROKE_WIDTH_TO_WORLD,
      worldUnits: true,
      transparent: true,
      opacity: vm.getStrokeOpacity(),
    });
    material.resolution.set(resolution[0], resolution[1]);
    const line = new Line2(geometry, material);
    line.renderOrder = vm.zIndex;
    group.add(line);
  }
  return group.children.length ? group : null;
}

/** Full Three.js representation of a VMobject: fill mesh + stroke lines. */
export function buildVMobjectObject3D(vm, resolution = [1920, 1080]) {
  const group = new THREE.Group();
  group.userData.mobject = vm;
  // Depth-tested mobjects (3D solids) need a lit, true-3D fill that occludes by
  // z; 2D mobjects keep the flat ShapeGeometry painter's-order fill.
  const fill = vm.depthTest ? build3DFillMesh(vm) : buildFillMesh(vm);
  if (fill) group.add(fill);
  const stroke = buildStrokeLines(vm, resolution);
  if (stroke) {
    if (vm.depthTest) {
      stroke.traverse((o) => {
        if (o.material) {
          o.material.depthTest = true;
          o.material.depthWrite = true;
        }
      });
    }
    group.add(stroke);
  }
  group.renderOrder = vm.zIndex;
  return group;
}
