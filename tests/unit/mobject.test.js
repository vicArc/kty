import { describe, it, expect } from 'vitest';
import { Mobject, Group, Point } from '../../src/mobject/mobject.js';
import { UP, RIGHT, LEFT, FRAME_X_RADIUS } from '../../src/foundation/constants.js';

// Axis-aligned 2x2 square centered at the origin.
const square = () => {
  const m = new Mobject();
  m.setPoints([
    [-1, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [-1, 1, 0],
  ]);
  return m;
};
const closeVec = (a, b, p = 9) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('Mobject points & bounding box', () => {
  it('stores points and reports counts', () => {
    const m = square();
    expect(m.getNumPoints()).toBe(4);
    expect(m.hasPoints()).toBe(true);
    expect(m.getPoints()[0]).toEqual([-1, -1, 0]);
  });

  it('computes center, size, and edges', () => {
    const m = square();
    closeVec(m.getCenter(), [0, 0, 0]);
    expect(m.getWidth()).toBeCloseTo(2, 9);
    expect(m.getHeight()).toBeCloseTo(2, 9);
    closeVec(m.getRight(), [1, 0, 0]);
    closeVec(m.getTop(), [0, 1, 0]);
  });
});

describe('Mobject transforms', () => {
  it('shift moves the center', () => {
    const m = square().shift([1, 2, 0]);
    closeVec(m.getCenter(), [1, 2, 0]);
  });

  it('scale about center keeps the center and grows size', () => {
    const m = square().scale(2);
    closeVec(m.getCenter(), [0, 0, 0]);
    expect(m.getWidth()).toBeCloseTo(4, 9);
  });

  it('rotate about origin maps +x to +y', () => {
    const line = new Mobject();
    line.setPoints([
      [-1, 0, 0],
      [1, 0, 0],
    ]);
    line.rotate(Math.PI / 2);
    closeVec(line.getPoints()[1], [0, 1, 0]);
  });

  it('stretch scales a single dimension', () => {
    const m = square().stretch(3, 0);
    expect(m.getWidth()).toBeCloseTo(6, 9);
    expect(m.getHeight()).toBeCloseTo(2, 9);
  });

  it('setWidth scales uniformly; stretchToFitWidth does not', () => {
    expect(square().setWidth(4).getHeight()).toBeCloseTo(4, 9);
    expect(square().stretchToFitWidth(4).getHeight()).toBeCloseTo(2, 9);
  });
});

describe('Mobject positioning', () => {
  it('moveTo a point', () => {
    closeVec(square().moveTo([3, 0, 0]).getCenter(), [3, 0, 0]);
  });

  it('nextTo places adjacent edges flush', () => {
    const a = square();
    const b = square().nextTo(a, RIGHT, 0);
    expect(b.getLeft()[0]).toBeCloseTo(a.getRight()[0], 9);
  });

  it('toEdge aligns to the frame border with a buffer', () => {
    const m = square().toEdge(LEFT, 0.5);
    expect(m.getLeft()[0]).toBeCloseTo(-FRAME_X_RADIUS + 0.5, 9);
  });

  it('alignTo lines up an edge', () => {
    const a = square().shift([0, 3, 0]);
    const b = square();
    b.alignTo(a, UP);
    expect(b.getTop()[1]).toBeCloseTo(a.getTop()[1], 9);
  });

  it('setX/getX', () => {
    const m = square().setX(5);
    expect(m.getX()).toBeCloseTo(5, 9);
  });
});

describe('Mobject color & opacity', () => {
  it('setColor / getColor', () => {
    const m = square().setColor('#FF0000');
    expect(m.getColor()).toBe('#FF0000');
    expect(m.data.getRow('rgba', 0)).toEqual([1, 0, 0, 1]);
  });

  it('setOpacity / getOpacity', () => {
    const m = square().setOpacity(0.25);
    expect(m.getOpacity()).toBeCloseTo(0.25, 9);
  });

  it('color set before points still applies once points exist (via defaults)', () => {
    const m = new Mobject({ color: '#00FF00' });
    m.setPoints([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    expect(m.getColor()).toBe('#00FF00');
  });
});

describe('Mobject family', () => {
  it('add/remove maintains parent and family links', () => {
    const a = square();
    const b = square();
    const g = new Group(a, b);
    expect(g.getFamily()).toContain(a);
    expect(a.parents).toContain(g);
    g.remove(a);
    expect(g.getFamily()).not.toContain(a);
    expect(a.parents).not.toContain(g);
  });

  it('group bounding box spans its submobjects', () => {
    const a = square().shift([-3, 0, 0]);
    const b = square().shift([3, 0, 0]);
    const g = new Group(a, b);
    expect(g.getWidth()).toBeCloseTo(8, 9); // from x=-4 to x=4
    closeVec(g.getCenter(), [0, 0, 0]);
  });

  it('transforms recurse into the family', () => {
    const a = square().shift([-3, 0, 0]);
    const b = square().shift([3, 0, 0]);
    new Group(a, b).shift([0, 1, 0]);
    closeVec(a.getCenter(), [-3, 1, 0]);
    closeVec(b.getCenter(), [3, 1, 0]);
  });
});

describe('Mobject updaters', () => {
  it('runs updaters on update(dt)', () => {
    const m = square();
    m.addUpdater((mob, dt) => mob.shift([dt, 0, 0]), false);
    expect(m.hasUpdaters()).toBe(true);
    m.update(0.5);
    closeVec(m.getCenter(), [0.5, 0, 0]);
  });

  it('clearUpdaters removes them', () => {
    const m = square();
    m.addUpdater(() => {}, false);
    m.clearUpdaters();
    expect(m.hasUpdaters()).toBe(false);
  });
});

describe('Mobject copy & state', () => {
  it('copy is independent of the original', () => {
    const m = square().setColor('#FF0000');
    const c = m.copy();
    c.shift([5, 0, 0]).setColor('#0000FF');
    closeVec(m.getCenter(), [0, 0, 0]);
    expect(m.getColor()).toBe('#FF0000');
    closeVec(c.getCenter(), [5, 0, 0]);
  });

  it('copy deep-copies submobjects', () => {
    const g = new Group(square(), square());
    const c = g.copy();
    c.submobjects[0].shift([2, 0, 0]);
    expect(g.submobjects[0].getCenter()[0]).toBeCloseTo(0, 9);
  });

  it('saveState / restore round-trips', () => {
    const m = square().saveState();
    m.shift([4, 0, 0]).setColor('#FF0000');
    m.restore();
    closeVec(m.getCenter(), [0, 0, 0]);
  });
});

describe('Group and Point', () => {
  it('Group accepts an array or varargs', () => {
    const a = square();
    const b = square();
    expect(new Group([a, b]).submobjects.length).toBe(2);
    expect(new Group(a, b).submobjects.length).toBe(2);
  });

  it('Point holds a single location', () => {
    const p = new Point({ location: [1, 2, 3] });
    closeVec(p.getLocation(), [1, 2, 3]);
    closeVec(p.getCenter(), [1, 2, 3]);
  });
});
