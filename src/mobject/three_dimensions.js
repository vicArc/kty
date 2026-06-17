// 3D primitives built on Surface — port of the Surface-based shapes in
// manimlib/mobject/three_dimensions.py (Sphere, Torus, Square3D, Cube, Prism).
// VMobject-based 3D shapes (VCube, Dodecahedron) and trimesh/OBJ loading are
// deferred; these are the parametric meshes the new renderer Mesh path unlocks.

import { Surface } from './surface.js';
import { Mobject } from './mobject.js';
import { VMobject, VGroup } from './vmobject.js';
import {
  ORIGIN,
  RIGHT,
  UP,
  LEFT,
  DOWN,
  OUT,
  PI,
  TAU,
  BLUE,
  GREY,
} from '../foundation/constants.js';
import { getNorm, zToVector } from '../foundation/space_ops.js';

const isOut = (v) => v[0] === 0 && v[1] === 0 && v[2] > 0;
const lerp = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);
const linspace = (a, b, n) =>
  n <= 1 ? [a] : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

export class Sphere extends Surface {
  constructor({
    radius = 1.0,
    uRange = [0, TAU],
    vRange = [0, PI],
    resolution = [101, 51],
    clockwise = false,
    normalNudge = 1e-3,
    ...rest
  } = {}) {
    const sign = clockwise ? -1 : 1;
    super({
      ...rest,
      uRange,
      vRange,
      resolution,
      normalNudge,
      uvFunc: (u, v) => [
        radius * Math.cos(sign * u) * Math.sin(v),
        radius * Math.sin(sign * u) * Math.sin(v),
        -radius * Math.cos(v),
      ],
    });
    this.radius = radius;
    // Bespoke normals (radial) avoid the degenerate cross-product at the poles.
    const pt = this.data.get('point');
    const dn = this.data.get('d_normal_point');
    const factor = (radius + normalNudge) / radius;
    for (let i = 0; i < dn.length; i++) dn[i] = pt[i] * factor;
  }
}

export class Torus extends Surface {
  constructor({
    r1 = 3.0,
    r2 = 1.0,
    uRange = [0, TAU],
    vRange = [0, TAU],
    resolution = [101, 51],
    ...rest
  } = {}) {
    super({
      ...rest,
      uRange,
      vRange,
      resolution,
      uvFunc: (u, v) => {
        const ring = r1 - r2 * Math.cos(v);
        return [ring * Math.cos(u), ring * Math.sin(u), -r2 * Math.sin(v)];
      },
    });
    this.r1 = r1;
    this.r2 = r2;
  }
}

/** A flat unit-ish square in the xy-plane, scaled to side_length — a cube face. */
export class Square3D extends Surface {
  constructor({ sideLength = 2.0, resolution = [2, 2], color = GREY, ...rest } = {}) {
    super({
      ...rest,
      color,
      uRange: [-1, 1],
      vRange: [-1, 1],
      resolution,
      uvFunc: (u, v) => [u, v, 0],
    });
    this.scale(sideLength / 2);
  }
}

/** The six faces of a cube as rotated copies of a single Square3D. */
function squareToCubeFaces(square, radius) {
  square.moveTo([0, 0, radius]); // radius * OUT
  const faces = [square.copy()];
  for (const axis of [RIGHT, UP, LEFT, DOWN]) {
    faces.push(square.copy().rotate(PI / 2, axis, { aboutPoint: ORIGIN }));
  }
  faces.push(square.copy().rotate(PI, RIGHT, { aboutPoint: ORIGIN }));
  return faces;
}

export class Cube extends Mobject {
  constructor({ color = BLUE, opacity = 1.0, sideLength = 2.0, squareResolution = [2, 2] } = {}) {
    super();
    this.sideLength = sideLength;
    const face = new Square3D({
      sideLength,
      resolution: squareResolution,
      color,
      opacity,
    });
    this.add(...squareToCubeFaces(face, sideLength / 2));
  }
}

export class Prism extends Cube {
  constructor({ width = 3.0, height = 2.0, depth = 1.0, ...rest } = {}) {
    super(rest);
    [width, height, depth].forEach((value, dim) =>
      this.rescaleToFit(value, dim, { stretch: true })
    );
  }
}

export class Cylinder extends Surface {
  constructor({
    uvFunc = (u, v) => [Math.cos(u), Math.sin(u), v],
    uRange = [0, TAU],
    vRange = [-1, 1],
    resolution = [101, 11],
    height = 2,
    radius = 1,
    axis = OUT,
    color = BLUE,
    ...rest
  } = {}) {
    super({ ...rest, color, uvFunc, uRange, vRange, resolution });
    this.scale(radius);
    this.setDepth(height, { stretch: true });
    if (!isOut(axis)) this.applyMatrix(zToVector(axis));
  }
}

export class Cone extends Cylinder {
  constructor({ vRange = [0, 1], ...rest } = {}) {
    super({
      uvFunc: (u, v) => [(1 - v) * Math.cos(u), (1 - v) * Math.sin(u), v],
      vRange,
      ...rest,
    });
  }
}

export class Line3D extends Cylinder {
  constructor({ start, end, width = 0.05, resolution = [21, 25], ...rest } = {}) {
    const axis = end.map((c, i) => c - start[i]);
    super({ height: getNorm(axis), radius: width / 2, axis, resolution, ...rest });
    this.shift(start.map((c, i) => 0.5 * (c + end[i])));
  }
}

export class Disk3D extends Surface {
  constructor({
    radius = 1,
    uRange = [0, 1],
    vRange = [0, TAU],
    resolution = [2, 100],
    ...rest
  } = {}) {
    super({
      ...rest,
      uvFunc: (u, v) => [u * Math.cos(v), u * Math.sin(v), 0],
      uRange,
      vRange,
      resolution,
    });
    this.scale(radius);
  }
}

/** A wireframe of a Surface's uv-grid lines, nudged slightly off the surface. */
export class SurfaceMesh extends VGroup {
  constructor(
    uvSurface,
    {
      resolution = [21, 11],
      strokeWidth = 1,
      strokeColor = GREY,
      normalNudge = 0.01,
      ...style
    } = {}
  ) {
    super();
    const [fullNu, fullNv] = uvSurface.resolution;
    const [partNu, partNv] = resolution;
    const pts = uvSurface.getPoints();
    const normals = uvSurface.getUnitNormals();
    const nudged = pts.map((p, k) => [
      p[0] + normalNudge * normals[k * 3],
      p[1] + normalNudge * normals[k * 3 + 1],
      p[2] + normalNudge * normals[k * 3 + 2],
    ]);

    const addLine = (row) =>
      this.add(new VMobject(style).setPointsSmoothly(row).setStroke(strokeColor, strokeWidth, 1));

    // Lines of constant u (sweeping v).
    for (const ui of linspace(0, fullNu - 1, partNu)) {
      const lo = fullNv * Math.floor(ui);
      const hi = fullNv * Math.ceil(ui);
      const frac = ui % 1;
      const row = [];
      for (let j = 0; j < fullNv; j++) row.push(lerp(nudged[lo + j], nudged[hi + j], frac));
      addLine(row);
    }
    // Lines of constant v (sweeping u).
    for (const vi of linspace(0, fullNv - 1, partNv)) {
      const flo = Math.floor(vi);
      const fhi = Math.ceil(vi);
      const frac = vi % 1;
      const col = [];
      for (let i = 0; i < fullNu; i++)
        col.push(lerp(nudged[i * fullNv + flo], nudged[i * fullNv + fhi], frac));
      addLine(col);
    }
  }
}
