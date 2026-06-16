import { describe, it, expect } from 'vitest';
import { DrawBorderThenFill, Write } from '../../src/animation/creation.js';
import { MoveAlongPath } from '../../src/animation/movement.js';
import { Square, Circle } from '../../src/mobject/geometry.js';
import { VMobject } from '../../src/mobject/vmobject.js';

describe('DrawBorderThenFill', () => {
  it('hides the fill early and restores it by the end', () => {
    const sq = new Square({ sideLength: 2, fillColor: '#FC6255', fillOpacity: 1 });
    const anim = new DrawBorderThenFill(sq);
    anim.begin();

    anim.interpolate(0.25); // phase 0 — drawing the border, fill hidden
    expect(sq.getFillOpacity()).toBeLessThan(0.2);

    anim.interpolate(1.0); // fully filled again
    expect(sq.getFillOpacity()).toBeCloseTo(1, 2);
  });

  it('builds a stroke-only outline', () => {
    const sq = new Square({ sideLength: 2, fillColor: '#FC6255', fillOpacity: 1 });
    const anim = new DrawBorderThenFill(sq, { strokeWidth: 3 });
    anim.begin();
    expect(anim.outline.getFillOpacity()).toBe(0);
    expect(anim.outline.getStrokeWidth()).toBeCloseTo(3, 5);
  });

  it('Write is a DrawBorderThenFill', () => {
    expect(new Write(new Square({ sideLength: 1 }))).toBeInstanceOf(DrawBorderThenFill);
  });
});

describe('MoveAlongPath', () => {
  it('moves the mobject along the path from start to end', () => {
    const path = new VMobject().setPointsAsCorners([
      [-3, 0, 0],
      [3, 0, 0],
    ]);
    const dot = new Circle({ radius: 0.2 });
    const anim = new MoveAlongPath(dot, path, { rateFunc: (t) => t });
    anim.begin();

    anim.interpolate(0);
    expect(dot.getCenter()[0]).toBeCloseTo(-3, 4);

    anim.interpolate(0.5);
    expect(dot.getCenter()[0]).toBeCloseTo(0, 4);

    anim.interpolate(1);
    expect(dot.getCenter()[0]).toBeCloseTo(3, 4);
  });
});
