// Adapts a VMobject onto native Three.js objects (docs/02):
//   fill   -> THREE.Shape / ShapeGeometry (earcut triangulation, built in)
//   stroke -> Line2 / LineGeometry / LineMaterial (fat world-unit lines)
// No WebGL context is needed to build these — only to render them.

import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';

// manim stroke_width is roughly pixels at 1080p; convert to world units so
// Line2 (worldUnits) tracks manim's coordinate system. Tunable at the visual gate.
export const STROKE_WIDTH_TO_WORLD = 8 / 1080;

// Parse the hex as sRGB (THREE converts it to its linear working space). With
// the renderer's sRGB output pass this round-trips back to the intended color,
// matching how manim treats colors. Passing raw 0..1 values would double-brighten.
const hexToThree = (hex) => new THREE.Color(hex);

/** One THREE.Shape per subpath (anchor/handle/anchor quadratics). */
export function vmobjectToShapes(vm) {
  const shapes = [];
  for (const sub of vm.getSubpaths()) {
    const shape = new THREE.Shape();
    shape.moveTo(sub[0][0], sub[0][1]);
    for (let i = 0; i + 2 < sub.length; i += 2) {
      const h = sub[i + 1];
      const a = sub[i + 2];
      shape.quadraticCurveTo(h[0], h[1], a[0], a[1]);
    }
    shapes.push(shape);
  }
  return shapes;
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

/** Stroke as one Line2 per subpath, grouped; or null if no stroke. */
export function buildStrokeLines(vm, resolution = [1920, 1080]) {
  if (vm.getStrokeWidth() <= 0 || vm.getStrokeOpacity() <= 0) return null;
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
  const fill = buildFillMesh(vm);
  if (fill) group.add(fill);
  const stroke = buildStrokeLines(vm, resolution);
  if (stroke) group.add(stroke);
  group.renderOrder = vm.zIndex;
  return group;
}
