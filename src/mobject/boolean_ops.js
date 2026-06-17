// Boolean operations between 2D VMobjects — port of manimlib/mobject/boolean_ops.py.
// manim uses skia `pathops` for exact bézier-aware booleans; we flatten each
// VMobject's subpaths to polygons, clip them with `polygon-clipping` (robust
// Martinez/Vatti-style), and rebuild the result as corner paths. Curves are
// therefore sampled (BOOLEAN_SAMPLES per quad) rather than preserved exactly —
// dense enough to read smoothly at typical sizes.

import polygonClipping from 'polygon-clipping';
import { VMobject } from './vmobject.js';

// Samples per quadratic when flattening a subpath to a polygon ring.
const BOOLEAN_SAMPLES = 24;

const isOpts = (o) => o && typeof o === 'object' && typeof o.getFamily !== 'function';

/** Even-odd ray-cast point-in-polygon (matches the fill renderer's hole rule). */
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Flatten one subpath (anchor/handle quadratics) to a closed [x,y] ring. */
function subpathToRing(sub) {
  const ring = [[sub[0][0], sub[0][1]]];
  for (let i = 0; i + 2 < sub.length; i += 2) {
    const a0 = sub[i];
    const h = sub[i + 1];
    const a1 = sub[i + 2];
    for (let s = 1; s <= BOOLEAN_SAMPLES; s++) {
      const t = s / BOOLEAN_SAMPLES;
      const u = 1 - t;
      ring.push([
        u * u * a0[0] + 2 * u * t * h[0] + t * t * a1[0],
        u * u * a0[1] + 2 * u * t * h[1] + t * t * a1[1],
      ]);
    }
  }
  return ring;
}

/**
 * Convert a VMobject (and its family) to a MultiPolygon: each outer ring with
 * its enclosed rings as holes, nested by even-odd containment depth (so a glyph
 * like 'O' keeps its counter).
 */
function vmobjectToMultiPolygon(vmobject) {
  const rings = [];
  for (const sm of vmobject.familyMembersWithPoints()) {
    for (const sub of sm.getSubpaths()) {
      if (sub.length >= 3) {
        const ring = subpathToRing(sub);
        if (ring.length >= 3) rings.push(ring);
      }
    }
  }
  if (rings.length === 0) return [];
  // A ring at odd containment depth is a hole of its immediate (smallest
  // enclosing) container; even-depth rings are solid outer rings.
  const reps = rings.map((r) => r[0]);
  const contains = (i, j) => i !== j && pointInRing(reps[i][0], reps[i][1], rings[j]);
  const depth = rings.map((_, i) => rings.reduce((d, _r, j) => d + (contains(i, j) ? 1 : 0), 0));
  const polygons = rings.map((r, i) => (depth[i] % 2 === 0 ? [r] : null));
  rings.forEach((r, i) => {
    if (depth[i] % 2 === 0) return;
    let parent = -1;
    let parentDepth = -1;
    for (let j = 0; j < rings.length; j++) {
      if (contains(i, j) && depth[j] > parentDepth) {
        parent = j;
        parentDepth = depth[j];
      }
    }
    if (parent >= 0 && polygons[parent]) polygons[parent].push(r);
  });
  return polygons.filter(Boolean);
}

/** Lay a clipped MultiPolygon back onto a VMobject as corner subpaths. */
function multiPolygonToVMobject(multiPoly, vmobject) {
  vmobject._resetPath();
  for (const polygon of multiPoly) {
    for (const ring of polygon) {
      if (ring.length < 3) continue;
      // polygon-clipping closes rings (last point repeats the first); drop it.
      const pts = ring.slice(0, -1).map(([x, y]) => [x, y, 0]);
      if (pts.length < 3) continue;
      vmobject.startNewPath(pts[0]);
      for (let i = 1; i < pts.length; i++) vmobject.addLineTo(pts[i]);
      vmobject.addLineTo(pts[0]); // close
    }
  }
  return vmobject;
}

function splitArgs(args, min, name) {
  let opts = {};
  if (args.length && isOpts(args[args.length - 1])) opts = args.pop();
  if (args.length < min) throw new Error(`At least ${min} mobjects needed for ${name}.`);
  return [args, opts];
}

/** The union (combined outline) of two or more VMobjects. */
export class Union extends VMobject {
  constructor(...args) {
    const [vmobjects, opts] = splitArgs(args, 2, 'Union');
    super(opts);
    const polys = vmobjects.map(vmobjectToMultiPolygon);
    multiPolygonToVMobject(polygonClipping.union(polys[0], ...polys.slice(1)), this);
  }
}

/** The subject minus the clip region. */
export class Difference extends VMobject {
  constructor(subject, clip, opts = {}) {
    super(opts);
    multiPolygonToVMobject(
      polygonClipping.difference(vmobjectToMultiPolygon(subject), vmobjectToMultiPolygon(clip)),
      this
    );
  }
}

/** The overlapping region common to all given VMobjects. */
export class Intersection extends VMobject {
  constructor(...args) {
    const [vmobjects, opts] = splitArgs(args, 2, 'Intersection');
    super(opts);
    const polys = vmobjects.map(vmobjectToMultiPolygon);
    multiPolygonToVMobject(polygonClipping.intersection(polys[0], ...polys.slice(1)), this);
  }
}

/** The symmetric difference (xor) — regions in an odd number of the inputs. */
export class Exclusion extends VMobject {
  constructor(...args) {
    const [vmobjects, opts] = splitArgs(args, 2, 'Exclusion');
    super(opts);
    const polys = vmobjects.map(vmobjectToMultiPolygon);
    multiPolygonToVMobject(polygonClipping.xor(polys[0], ...polys.slice(1)), this);
  }
}
