import { describe, it, expect } from 'vitest';
import { MobjectData } from '../../src/data/mobject_data.js';

describe('MobjectData', () => {
  it('starts empty with the default schema', () => {
    const d = new MobjectData();
    expect(d.length).toBe(0);
    expect(d.itemSize('point')).toBe(3);
    expect(d.itemSize('rgba')).toBe(4);
  });

  it('resizes from empty by seeding the default row', () => {
    const d = new MobjectData();
    d.resize(3, 'order');
    expect(d.length).toBe(3);
    // defaults are ones → rgba rows all white opaque
    expect(d.getRow('rgba', 0)).toEqual([1, 1, 1, 1]);
    expect(d.getRow('rgba', 2)).toEqual([1, 1, 1, 1]);
  });

  it('preserves style across a resize-to-zero round trip', () => {
    const d = new MobjectData();
    d.resize(2, 'order');
    d.setRow('rgba', 0, [1, 0, 0, 1]);
    d.setRow('rgba', 1, [1, 0, 0, 1]);
    d.resize(0); // saves row 0 into defaults
    d.resize(4, 'order'); // restores from defaults
    expect(d.getRow('rgba', 0)).toEqual([1, 0, 0, 1]);
    expect(d.getRow('rgba', 3)).toEqual([1, 0, 0, 1]);
  });

  it('order resize repeats rows; tile resize cycles rows', () => {
    const d = new MobjectData([['point', 1]]);
    d.resize(3, 'order');
    d.setColumn('point', [10, 20, 30]);
    const order = new MobjectData([['point', 1]]);
    order.resize(3, 'order');
    order.setColumn('point', [10, 20, 30]);
    order.resize(5, 'order');
    expect([...order.get('point')]).toEqual([10, 10, 20, 20, 30]);

    const tile = new MobjectData([['point', 1]]);
    tile.resize(3, 'order');
    tile.setColumn('point', [10, 20, 30]);
    tile.resize(5, 'tile');
    expect([...tile.get('point')]).toEqual([10, 20, 30, 10, 20]);
  });

  it('clone is independent', () => {
    const d = new MobjectData();
    d.resize(1, 'order');
    d.setRow('point', 0, [1, 2, 3]);
    const c = d.clone();
    c.setRow('point', 0, [9, 9, 9]);
    expect(d.getRow('point', 0)).toEqual([1, 2, 3]);
    expect(c.getRow('point', 0)).toEqual([9, 9, 9]);
  });
});
