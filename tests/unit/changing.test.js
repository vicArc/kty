import { describe, it, expect } from 'vitest';
import { TracedPath, TracingTail, AnimatedBoundary } from '../../src/mobject/changing.js';
import { Circle } from '../../src/mobject/geometry.js';

describe('TracedPath', () => {
  it('accumulates the traced point each update', () => {
    let x = 0;
    const tp = new TracedPath(() => [x, 0, 0]);
    expect(tp.getNumPoints()).toBe(0);
    x = 1;
    tp.update(0.1);
    x = 2;
    tp.update(0.1);
    x = 3;
    tp.update(0.1);
    expect(tp.tracedPoints).toHaveLength(3);
    expect(tp.getNumPoints()).toBeGreaterThan(0); // a curve was built
  });

  it('each instance has its own traced-points array', () => {
    const a = new TracedPath(() => [0, 0, 0]);
    const b = new TracedPath(() => [0, 0, 0]);
    a.update(0.1);
    expect(a.tracedPoints).toHaveLength(1);
    expect(b.tracedPoints).toHaveLength(0);
  });

  it('TracingTail follows a mobject and keeps a bounded trail', () => {
    const dot = new Circle({ radius: 0.1 });
    const tail = new TracingTail(dot, { timeTraced: 0.5, timePerAnchor: 0.1 });
    // Pre-seeded with the current point so the trail starts full-length.
    expect(tail.tracedPoints.length).toBeGreaterThan(1);
    dot.shift([1, 0, 0]);
    tail.update(0.1);
    expect(tail.getNumPoints()).toBeGreaterThan(0);
  });
});

describe('AnimatedBoundary', () => {
  it('wraps a mobject in two boundary copies and animates them', () => {
    const circle = new Circle({ radius: 1 });
    const ab = new AnimatedBoundary(circle);
    expect(ab.submobjects).toHaveLength(2);
    // Advance past one full cycle so the fading copy is also drawn.
    for (let i = 0; i < 6; i++) ab.update(0.5);
    const [growing] = ab.boundaryCopies;
    expect(growing.getNumPoints()).toBeGreaterThan(0);
    expect(growing.getStrokeWidth()).toBeGreaterThan(0);
  });
});
