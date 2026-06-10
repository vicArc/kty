// Build VMobjects from SVG path data (docs/02: SVG → Shape/Line2). The native
// THREE.SVGLoader path is browser-only (needs DOMParser); this parser-based
// path works in Node too, which keeps Tex/Text unit-testable.

import { VMobject, VGroup } from '../vmobject.js';
import { parsePathD } from './svg_path.js';

export const IDENTITY_AFFINE = [1, 0, 0, 1, 0, 0];

/** Apply an SVG affine [a,b,c,d,e,f] to a 2D point. */
export function applyAffine([a, b, c, d, e, f], [x, y]) {
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Compose two SVG affines (m1 applied after m2: result = m1 ∘ m2). */
export function composeAffine(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export class VMobjectFromSVGPath extends VMobject {
  constructor({ d, transform = IDENTITY_AFFINE, ...style } = {}) {
    super(style);
    this._buildFromD(d, transform);
  }

  _buildFromD(d, tf) {
    const to3 = (p) => [...applyAffine(tf, p), 0];
    for (const sp of parsePathD(d)) {
      this.startNewPath(to3(sp.start));
      for (const seg of sp.segments) {
        if (seg.type === 'line') {
          this.addLineTo(to3(seg.points[0]));
        } else if (seg.type === 'quad') {
          this.addQuadraticBezierCurveTo(to3(seg.points[0]), to3(seg.points[1]));
        } else {
          this.addCubicBezierCurveTo(to3(seg.points[0]), to3(seg.points[1]), to3(seg.points[2]));
        }
      }
    }
  }
}

/**
 * A group of VMobjects, one per SVG path. `paths` is an array of either a
 * d-string or `{ d, transform, fillColor, ... }`.
 */
export class SVGMobject extends VGroup {
  constructor({
    paths = [],
    fillColor = '#FFFFFF',
    fillOpacity = 1.0,
    strokeWidth = 0.0,
    ...style
  } = {}) {
    super();
    for (const spec of paths) {
      const { d, transform, ...pathStyle } = typeof spec === 'string' ? { d: spec } : spec;
      this.add(
        new VMobjectFromSVGPath({
          d,
          transform,
          fillColor,
          fillOpacity,
          strokeWidth,
          ...style,
          ...pathStyle,
        })
      );
    }
  }
}
