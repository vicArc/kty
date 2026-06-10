import { describe, it, expect } from 'vitest';
import {
  NumberLine,
  Axes,
  NumberPlane,
  ParametricCurve,
  FunctionGraph,
  ImplicitFunction,
} from '../../src/index.js';
import { TAU } from '../../src/foundation/constants.js';

const closeVec = (a, b, p = 5) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('NumberLine', () => {
  it('maps numbers to points and back (n2p / p2n)', () => {
    const nl = new NumberLine({ xRange: [-5, 5, 1] });
    closeVec(nl.n2p(0), [0, 0, 0], 4);
    expect(nl.n2p(5)[0]).toBeCloseTo(5, 4);
    expect(nl.n2p(-5)[0]).toBeCloseTo(-5, 4);
    expect(nl.p2n([2.5, 0, 0])).toBeCloseTo(2.5, 4);
  });

  it('unitSize scales the spacing', () => {
    const nl = new NumberLine({ xRange: [-2, 2, 1], unitSize: 2 });
    expect(nl.n2p(2)[0]).toBeCloseTo(4, 4);
    expect(nl.getUnitSize()).toBeCloseTo(2, 4);
  });

  it('has ticks', () => {
    const nl = new NumberLine({ xRange: [-2, 2, 1] });
    expect(nl.ticks.submobjects.length).toBe(5); // -2,-1,0,1,2
  });
});

describe('Axes', () => {
  it('c2p / p2c round-trip', () => {
    const ax = new Axes({ xRange: [-5, 5, 1], yRange: [-4, 4, 1] });
    closeVec(ax.getOrigin(), [0, 0, 0], 4);
    const p = ax.c2p(3, 2);
    closeVec(p, [3, 2, 0], 4);
    const [x, y] = ax.p2c(p);
    expect(x).toBeCloseTo(3, 4);
    expect(y).toBeCloseTo(2, 4);
  });

  it('getGraph samples y=f(x) through the coordinate system', () => {
    const ax = new Axes({ xRange: [-3, 3, 1], yRange: [-3, 3, 1] });
    const graph = ax.getGraph((x) => x * x, { xRange: [-2, 2, 0.5] });
    expect(graph).toBeInstanceOf(ParametricCurve);
    // graph passes through (1,1) in coordinate space
    closeVec(graph.getPointFromFunction(1), ax.c2p(1, 1), 4);
  });
});

describe('NumberPlane', () => {
  it('adds background grid lines behind the axes', () => {
    const np = new NumberPlane({ xRange: [-2, 2, 1], yRange: [-2, 2, 1] });
    expect(np.backgroundLines.submobjects.length).toBe(10); // 5 vertical + 5 horizontal
    expect(np.backgroundLines.zIndex).toBe(-1);
  });
});

describe('functions', () => {
  it('FunctionGraph traces y=f(x)', () => {
    const g = new FunctionGraph({ func: (x) => 2 * x, xRange: [0, 4, 1] });
    closeVec(g.getStart(), [0, 0, 0], 4);
    closeVec(g.getEnd(), [4, 8, 0], 4);
  });

  it('ParametricCurve traces a circle', () => {
    const c = new ParametricCurve({
      tFunc: (t) => [Math.cos(t), Math.sin(t), 0],
      tRange: [0, TAU, TAU / 16],
    });
    expect(c.getNumPoints()).toBeGreaterThan(8);
    closeVec(c.getStart(), [1, 0, 0], 4);
  });

  it('ImplicitFunction extracts the unit circle x^2+y^2-1=0', () => {
    const circle = new ImplicitFunction({
      func: (x, y) => x * x + y * y - 1,
      xRange: [-2, 2],
      yRange: [-2, 2],
      resolution: 32,
    });
    expect(circle.hasPoints()).toBe(true);
    // every emitted point should lie ~on the unit circle
    const pts = circle.getPoints();
    const sample = pts.filter((_, i) => i % 7 === 0);
    for (const [x, y] of sample) {
      expect(Math.hypot(x, y)).toBeCloseTo(1, 1);
    }
  });
});
