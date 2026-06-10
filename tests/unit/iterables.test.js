import { describe, it, expect } from 'vitest';
import {
  removeListRedundancies,
  listUpdate,
  listDifferenceUpdate,
  adjacentPairs,
  adjacentNTuples,
  batchByProperty,
  listify,
  arrayIsConstant,
  arraysMatch,
  resizeArray,
  resizePreservingOrder,
  resizeWithInterpolation,
  makeEven,
} from '../../src/foundation/iterables.js';

describe('iterables', () => {
  it('removeListRedundancies keeps last occurrence, preserves order', () => {
    expect(removeListRedundancies([1, 2, 1, 3])).toEqual([2, 1, 3]);
  });

  it('listUpdate / listDifferenceUpdate', () => {
    expect(listUpdate([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(listDifferenceUpdate([1, 2, 3], [2])).toEqual([1, 3]);
  });

  it('adjacent tuples wrap around', () => {
    expect(adjacentPairs([1, 2, 3])).toEqual([
      [1, 2],
      [2, 3],
      [3, 1],
    ]);
    expect(adjacentNTuples([1, 2, 3], 3)).toEqual([
      [1, 2, 3],
      [2, 3, 1],
      [3, 1, 2],
    ]);
  });

  it('batchByProperty groups consecutive equal props', () => {
    const batches = batchByProperty([1, 1, 2, 2, 2, 1], (x) => x);
    expect(batches).toEqual([
      [[1, 1], 1],
      [[2, 2, 2], 2],
      [[1], 1],
    ]);
  });

  it('listify wraps scalars and strings but spreads arrays', () => {
    expect(listify('ab')).toEqual(['ab']);
    expect(listify([1, 2])).toEqual([1, 2]);
    expect(listify(5)).toEqual([5]);
  });

  it('arrayIsConstant / arraysMatch', () => {
    expect(arrayIsConstant([3, 3, 3])).toBe(true);
    expect(arrayIsConstant([3, 4])).toBe(false);
    expect(arraysMatch([1, 2], [1, 2])).toBe(true);
    expect(arraysMatch([1, 2], [1, 3])).toBe(false);
  });

  it('resizeArray tiles/truncates', () => {
    expect(resizeArray([1, 2, 3], 5)).toEqual([1, 2, 3, 1, 2]);
    expect(resizeArray([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it('resizePreservingOrder samples by index', () => {
    expect(resizePreservingOrder([10, 20, 30], 5)).toEqual([10, 10, 20, 20, 30]);
  });

  it('resizeWithInterpolation lerps between neighbors', () => {
    expect(resizeWithInterpolation([0, 10], 3)).toEqual([0, 5, 10]);
    expect(
      resizeWithInterpolation(
        [
          [0, 0],
          [10, 20],
        ],
        3
      )
    ).toEqual([
      [0, 0],
      [5, 10],
      [10, 20],
    ]);
  });

  it('makeEven stretches the shorter sequence', () => {
    const [a, b] = makeEven([1, 2], [9, 8, 7, 6]);
    expect(a.length).toBe(4);
    expect(b.length).toBe(4);
  });
});
