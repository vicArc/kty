// Specialized composite animations — port of manimlib/animation/specialized.py.

import { LaggedStart } from './composition.js';
import { Restore } from './transform.js';
import { Circle } from '../mobject/geometry.js';
import { VGroup } from '../mobject/vmobject.js';
import { BLACK, WHITE } from '../foundation/constants.js';

/**
 * Concentric circles expanding outward from a focal point — a "broadcast" /
 * ripple pulse. Each circle starts small and restores to big_radius, staggered
 * by lag_ratio.
 */
export class Broadcast extends LaggedStart {
  constructor(
    focalPoint,
    {
      smallRadius = 0.0,
      bigRadius = 5.0,
      nCircles = 5,
      startStrokeWidth = 8.0,
      color = WHITE,
      runTime = 3.0,
      lagRatio = 0.2,
      remover = true,
      ...rest
    } = {}
  ) {
    const circles = new VGroup();
    for (let i = 0; i < nCircles; i++) {
      const circle = new Circle({ radius: bigRadius, strokeColor: BLACK, strokeWidth: 0 });
      circle.addUpdater((c) => c.moveTo(focalPoint));
      circle.saveState(); // big-radius state to restore to
      circle.setWidth(smallRadius * 2);
      circle.setStroke(color, startStrokeWidth);
      circles.add(circle);
    }
    super(...circles.submobjects.map((c) => new Restore(c)), {
      runTime,
      lagRatio,
      remover,
      ...rest,
    });
  }
}
