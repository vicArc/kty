import { describe, it, expect } from 'vitest';
import { Scene, FadeIn, Transform } from '../../src/index.js';
import { Square } from '../../src/mobject/geometry.js';

const closeVec = (a, b, p = 4) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], p));

describe('Scene', () => {
  it('add/remove manage the mobject list', () => {
    const scene = new Scene();
    const a = new Square({ sideLength: 1 });
    const b = new Square({ sideLength: 1 });
    scene.add(a, b);
    expect(scene.getMobjects()).toEqual([a, b]);
    scene.remove(a);
    expect(scene.getMobjects()).toEqual([b]);
  });

  it('play runs an animation to its final state', async () => {
    const scene = new Scene({ fps: 10 });
    const sq = new Square({ sideLength: 1 });
    const target = new Square({ sideLength: 1 }).shift([3, 0, 0]);
    await scene.play(new Transform(sq, target));
    closeVec(sq.getCenter(), [3, 0, 0]);
    expect(scene.numPlays).toBe(1);
  });

  it('play advances scene time', async () => {
    const scene = new Scene({ fps: 30 });
    await scene.play(new FadeIn(new Square({ sideLength: 1 })));
    expect(scene.time).toBeCloseTo(1, 5);
  });

  it('FadeOut removes its mobject after play', async () => {
    const scene = new Scene({ fps: 10 });
    const sq = new Square({ sideLength: 1 });
    scene.add(sq);
    const { FadeOut } = await import('../../src/index.js');
    await scene.play(new FadeOut(sq));
    expect(scene.getMobjects()).not.toContain(sq);
  });

  it('wait advances time without changing mobjects', async () => {
    const scene = new Scene({ fps: 30 });
    const sq = new Square({ sideLength: 1 });
    scene.add(sq);
    await scene.wait(0.5);
    expect(scene.time).toBeCloseTo(0.5, 5);
    closeVec(sq.getCenter(), [0, 0, 0]);
  });
});

describe('.animate builder', () => {
  it('builds a Transform to the post-method state', async () => {
    const scene = new Scene({ fps: 10 });
    const sq = new Square({ sideLength: 1 });
    await scene.play(sq.animate.shift([2, 1, 0]));
    closeVec(sq.getCenter(), [2, 1, 0]);
  });

  it('chains multiple methods', async () => {
    const scene = new Scene({ fps: 10 });
    const sq = new Square({ sideLength: 2 });
    await scene.play(sq.animate.shift([4, 0, 0]).scale(0.5));
    closeVec(sq.getCenter(), [4, 0, 0]);
    expect(sq.getWidth()).toBeCloseTo(1, 4);
  });
});
