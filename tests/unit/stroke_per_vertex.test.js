import { describe, it, expect } from 'vitest';
import { VMobject } from '../../src/mobject/vmobject.js';
import { TracingTail } from '../../src/mobject/changing.js';
import { VShowPassingFlash } from '../../src/animation/indication.js';

function polyline() {
  const vm = new VMobject();
  vm.setPointsAsCorners([
    [-3, 0, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [3, 0, 0],
  ]);
  return vm;
}

describe('per-vertex stroke width', () => {
  it('reports no variation for a uniform stroke', () => {
    const vm = polyline().setStroke('#FFFFFF', 4, 1);
    expect(vm.hasVaryingStroke()).toBe(false);
  });

  it('accepts an array of widths and ramps across points', () => {
    const vm = polyline();
    vm.setStroke('#FFFFFF', [0, 8], 1);
    expect(vm.hasVaryingStroke()).toBe(true);
    const w = vm.data.get('stroke_width');
    expect(w[0]).toBeCloseTo(0, 5); // tail
    expect(w[w.length - 1]).toBeCloseTo(8, 5); // head
    expect(w[Math.floor(w.length / 2)]).toBeGreaterThan(0); // monotone ramp middle
  });

  it('exposes per-point stroke data per subpath', () => {
    const vm = polyline().setStroke('#FFFFFF', [0, 8], 1);
    const subs = vm.getSubpathsWithStroke();
    expect(subs).toHaveLength(1);
    expect(subs[0].points.length).toBe(subs[0].widths.length);
    expect(subs[0].widths[0]).toBeCloseTo(0, 5);
  });
});

describe('TracingTail', () => {
  it('tapers width from tail (0) to head', () => {
    let t = 0;
    const tail = new TracingTail(() => [t, 0, 0], { timeTraced: 1, strokeWidth: 6 });
    // advance the trail a few frames
    for (let i = 0; i < 6; i++) {
      t += 0.2;
      tail.update(0.1);
    }
    expect(tail.hasVaryingStroke()).toBe(true);
    const w = tail.data.get('stroke_width');
    expect(w[0]).toBeLessThan(w[w.length - 1]); // tail thinner than head
  });
});

describe('VShowPassingFlash', () => {
  it('restores original widths after finishing', () => {
    const vm = polyline().setStroke('#FFFFFF', 5, 1);
    const before = Array.from(vm.data.get('stroke_width'));
    const anim = new VShowPassingFlash(vm, { timeWidth: 0.3 });
    anim.begin();
    anim.interpolate(0.5); // mid-sweep mutates widths
    const mid = Array.from(vm.data.get('stroke_width'));
    expect(Math.max(...mid)).toBeLessThanOrEqual(5 + 1e-6);
    expect(Math.min(...mid)).toBeLessThan(5); // band leaves some points dimmed
    anim.finish();
    const after = Array.from(vm.data.get('stroke_width'));
    after.forEach((w, i) => expect(w).toBeCloseTo(before[i], 5));
  });
});
