import { describe, it, expect } from 'vitest';
import { mergeDictsRecursively } from '../../src/foundation/dict_ops.js';
import {
  extractMobjectFamilyMembers,
  recursiveMobjectRemove,
} from '../../src/foundation/family_ops.js';

// Minimal stub node mirroring the Mobject family interface.
class Node {
  constructor(name, submobjects = []) {
    this.name = name;
    this.submobjects = submobjects;
  }
  getFamily() {
    return [this, ...this.submobjects.flatMap((s) => s.getFamily())];
  }
  hasPoints() {
    return this.submobjects.length === 0;
  }
}

describe('dict_ops', () => {
  it('merges recursively, later wins', () => {
    const a = { x: 1, nested: { p: 1, q: 2 } };
    const b = { y: 2, nested: { q: 3, r: 4 } };
    expect(mergeDictsRecursively(a, b)).toEqual({
      x: 1,
      y: 2,
      nested: { p: 1, q: 3, r: 4 },
    });
  });

  it('ignores nullish dicts', () => {
    expect(mergeDictsRecursively(null, { a: 1 }, undefined)).toEqual({ a: 1 });
  });
});

describe('family_ops', () => {
  it('extracts family members', () => {
    const leaf = new Node('leaf');
    const root = new Node('root', [leaf]);
    expect(extractMobjectFamilyMembers([root]).map((n) => n.name)).toEqual(['root', 'leaf']);
  });

  it('excludes pointless when asked', () => {
    const leaf = new Node('leaf');
    const root = new Node('root', [leaf]);
    expect(extractMobjectFamilyMembers([root], true).map((n) => n.name)).toEqual(['leaf']);
  });

  it('recursiveMobjectRemove replaces a parent with its surviving children', () => {
    const a = new Node('a');
    const b = new Node('b');
    const group = new Node('group', [a, b]);
    const [result, found] = recursiveMobjectRemove([group], new Set([a]));
    expect(found).toBe(true);
    expect(result.map((n) => n.name)).toEqual(['b']);
  });
});
