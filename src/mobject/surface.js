// Parametric 3D surfaces — port of manimlib/mobject/types/surface.py.
// A Surface samples a uv_func over an (nu, nv) grid into a `point` column, plus
// a `d_normal_point` column (a point nudged along the surface normal) so the
// renderer can recover smooth per-vertex normals. The grid is triangulated into
// an index buffer that the Three.js Mesh path consumes (render/three/surface_geometry).

import { Mobject } from './mobject.js';
import { GREY } from '../foundation/constants.js';
import { cross, normalize } from '../foundation/space_ops.js';

export const SURFACE_SCHEMA = [
  ['point', 3],
  ['d_normal_point', 3],
  ['rgba', 4],
];

const linspace = (a, b, n) => {
  if (n <= 1) return [a];
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
  return out;
};

export class Surface extends Mobject {
  // Both columns are spatial, so transforms (scale/rotate/applyMatrix) move both.
  pointlikeDataKeys = ['point', 'd_normal_point'];

  constructor({
    color = GREY,
    opacity = 1.0,
    uRange = [0, 1],
    vRange = [0, 1],
    // Number of points sampled per axis (one more than the number of quads).
    resolution = [51, 51],
    uvFunc = null,
    epsilon = 1e-3, // du/dv step for normal estimation
    normalNudge = 1e-3, // how far d_normal_point steps off the surface
    ...rest
  } = {}) {
    super({ ...rest, color, opacity, schema: SURFACE_SCHEMA });
    this.uRange = uRange;
    this.vRange = vRange;
    this.resolution = resolution;
    this._uvFunc = uvFunc;
    this.epsilon = epsilon;
    this.normalNudge = normalNudge;
    this.triangleIndices = new Uint32Array(0);
    this._build();
  }

  /** Marks this for the renderer's Mesh path (vs the default VMobject path). */
  get renderType() {
    return 'surface';
  }

  /** Override in subclasses, or pass `uvFunc` to the constructor. */
  uvFunc(u, v) {
    return [u, v, 0];
  }

  _evalUV(u, v) {
    return this._uvFunc ? this._uvFunc(u, v) : this.uvFunc(u, v);
  }

  /** super()'s constructor calls this before config exists — guard until _build. */
  initPoints() {
    if (!this.resolution) return;
    const [nu, nv] = this.resolution;
    const us = linspace(this.uRange[0], this.uRange[1], nu);
    const vs = linspace(this.vRange[0], this.vRange[1], nv);
    const eps = this.epsilon;

    const points = [];
    const dNormal = [];
    // Row-major over u then v (matches compute_triangle_indices' index grid).
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const u = us[i];
        const v = vs[j];
        const p = this._evalUV(u, v);
        const pdu = this._evalUV(u + eps, v);
        const pdv = this._evalUV(u, v + eps);
        const n = normalize(
          cross(
            [pdu[0] - p[0], pdu[1] - p[1], pdu[2] - p[2]],
            [pdv[0] - p[0], pdv[1] - p[1], pdv[2] - p[2]]
          )
        );
        points.push(p);
        dNormal.push([
          p[0] + this.normalNudge * n[0],
          p[1] + this.normalNudge * n[1],
          p[2] + this.normalNudge * n[2],
        ]);
      }
    }
    this.setPoints(points);
    const dn = this.data.get('d_normal_point');
    for (let k = 0; k < dNormal.length; k++) {
      dn[k * 3] = dNormal[k][0];
      dn[k * 3 + 1] = dNormal[k][1];
      dn[k * 3 + 2] = dNormal[k][2];
    }
    return this;
  }

  _build() {
    this.initPoints();
    this.computeTriangleIndices();
    this.setColor(this.color, this.opacity);
    return this;
  }

  /** Two triangles per grid quad, as a flat index buffer (manim's order). */
  computeTriangleIndices() {
    const [nu, nv] = this.resolution;
    if (nu < 2 || nv < 2) {
      this.triangleIndices = new Uint32Array(0);
      return this.triangleIndices;
    }
    const idx = (i, j) => i * nv + j;
    const indices = new Uint32Array(6 * (nu - 1) * (nv - 1));
    let k = 0;
    for (let i = 0; i < nu - 1; i++) {
      for (let j = 0; j < nv - 1; j++) {
        indices[k++] = idx(i, j); // top left
        indices[k++] = idx(i + 1, j); // bottom left
        indices[k++] = idx(i, j + 1); // top right
        indices[k++] = idx(i, j + 1); // top right
        indices[k++] = idx(i + 1, j); // bottom left
        indices[k++] = idx(i + 1, j + 1); // bottom right
      }
    }
    this.triangleIndices = indices;
    return indices;
  }

  getTriangleIndices() {
    return this.triangleIndices;
  }

  /** Per-vertex unit normals, recovered from d_normal_point - point. */
  getUnitNormals() {
    const pt = this.data.get('point');
    const dn = this.data.get('d_normal_point');
    const n = this.data.length;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const nv = normalize([
        dn[i * 3] - pt[i * 3],
        dn[i * 3 + 1] - pt[i * 3 + 1],
        dn[i * 3 + 2] - pt[i * 3 + 2],
      ]);
      out[i * 3] = nv[0];
      out[i * 3 + 1] = nv[1];
      out[i * 3 + 2] = nv[2];
    }
    return out;
  }
}

/** Surface from an explicit uv_func — manim's ParametricSurface. */
export class ParametricSurface extends Surface {
  constructor(uvFunc, opts = {}) {
    super({ ...opts, uvFunc });
  }
}
