// 3D primitives built on Surface — port of the Surface-based shapes in
// manimlib/mobject/three_dimensions.py (Sphere, Torus, Square3D, Cube, Prism).
// VMobject-based 3D shapes (VCube, Dodecahedron) and trimesh/OBJ loading are
// deferred; these are the parametric meshes the new renderer Mesh path unlocks.

import { Surface } from './surface.js';
import { Mobject } from './mobject.js';
import { ORIGIN, RIGHT, UP, LEFT, DOWN, PI, TAU, BLUE, GREY } from '../foundation/constants.js';

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
