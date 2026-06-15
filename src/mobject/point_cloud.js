// Point clouds — port of point_cloud_mobject.py + dot_cloud.py.
// PMobject is a bag of colored points; DotCloud gives each point a world-space
// radius (and an optional glow), rendered through the THREE.Points path
// (render/three/points_geometry). Radius lives in its own data column so it
// interpolates and resizes alongside points/colors.

import { Mobject } from './mobject.js';
import { GREY, YELLOW, ORIGIN } from '../foundation/constants.js';
import { colorToRgba, colorGradient } from '../foundation/color.js';
import { resizeWithInterpolation } from '../foundation/iterables.js';

export const DEFAULT_DOT_RADIUS = 0.05;
export const DEFAULT_GLOW_DOT_RADIUS = 0.2;

export class PMobject extends Mobject {
  /** Routes to the renderer's THREE.Points path. */
  get renderType() {
    return 'points';
  }

  /** Append points with an optional uniform color/opacity (manim's add_points). */
  addPoints(points, { color = null, opacity = null } = {}) {
    this.appendPoints(points);
    if (color !== null) {
      const op = opacity === null ? this.data.getRow('rgba', this.data.length - 1)[3] : opacity;
      const rgba = colorToRgba(color, op);
      for (let i = this.data.length - points.length; i < this.data.length; i++) {
        this.data.setRow('rgba', i, rgba);
      }
    }
    return this.noteChangedData();
  }

  addPoint(point, opts = {}) {
    return this.addPoints([point], opts);
  }

  setColorByGradient(...colors) {
    const grad = colorGradient(colors, this.getNumPoints());
    for (let i = 0; i < this.getNumPoints(); i++) {
      this.data.setRow('rgba', i, colorToRgba(grad[i], 1));
    }
    return this.noteChangedData();
  }
}

export class PGroup extends PMobject {
  constructor(...pmobs) {
    super();
    this.add(...pmobs);
  }
}

export const DOT_CLOUD_SCHEMA = [
  ['point', 3],
  ['radius', 1],
  ['rgba', 4],
];

export class DotCloud extends PMobject {
  constructor({
    points = [],
    color = GREY,
    opacity = 1.0,
    radius = DEFAULT_DOT_RADIUS,
    glowFactor = 0.0,
    ...rest
  } = {}) {
    super({ ...rest, color, opacity, schema: DOT_CLOUD_SCHEMA });
    this.glowFactor = glowFactor;
    if (points.length) this.setPoints(points);
    this.setColor(color, opacity);
    this.setRadius(radius);
  }

  /** Uniform radius across all points (world units). */
  setRadius(radius) {
    const col = this.hasPoints() ? this.data.get('radius') : this.data.defaults.get('radius');
    col.fill(radius);
    this.refreshBoundingBox();
    return this.noteChangedData();
  }

  /** Per-point radii (resized with interpolation to match the point count). */
  setRadii(radii) {
    const n = this.getNumPoints();
    const r = resizeWithInterpolation(
      radii.map((x) => [x]),
      n
    );
    const col = this.data.get('radius');
    for (let i = 0; i < n; i++) col[i] = r[i][0];
    this.refreshBoundingBox();
    return this.noteChangedData();
  }

  getRadii() {
    const col = this.data.get('radius');
    return Array.from(col.subarray(0, this.getNumPoints()));
  }

  getRadius() {
    const radii = this.getRadii();
    return radii.length ? Math.max(...radii) : this.data.defaults.get('radius')[0];
  }

  setGlowFactor(glowFactor) {
    this.glowFactor = glowFactor;
    return this;
  }
}

export class TrueDot extends DotCloud {
  constructor({ center = ORIGIN, ...rest } = {}) {
    super({ ...rest, points: [center] });
  }
}

export class GlowDots extends DotCloud {
  constructor({
    points = [],
    color = YELLOW,
    radius = DEFAULT_GLOW_DOT_RADIUS,
    glowFactor = 2.0,
    ...rest
  } = {}) {
    super({ ...rest, points, color, radius, glowFactor });
  }
}

export class GlowDot extends GlowDots {
  constructor({ center = ORIGIN, ...rest } = {}) {
    super({ ...rest, points: [center] });
  }
}
