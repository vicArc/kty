import { describe, it, expect } from 'vitest';
import { VMobject } from '../../src/mobject/vmobject.js';
import { Group } from '../../src/mobject/mobject.js';
import { assembleRenderGroups } from '../../src/render/render_backend.js';
import { ThreeRenderer } from '../../src/render/three/three_renderer.js';
import { resolveInserts, dedupeUniforms } from '../../src/render/three/shader_insert.js';

const square = (z = 0) => {
  const s = new VMobject().setPointsAsCorners([
    [-1, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [-1, -1, 0],
  ]);
  s.setZIndex(z);
  return s;
};

describe('assembleRenderGroups', () => {
  it('flattens family and orders by zIndex (stable)', () => {
    const a = square(2);
    const b = square(0);
    const c = square(0);
    const ordered = assembleRenderGroups([a, b, c]);
    expect(ordered).toEqual([b, c, a]); // z 0,0,2 with stable order
  });

  it('includes submobjects with points', () => {
    const g = new Group(square(0), square(1));
    const ordered = assembleRenderGroups([g]);
    expect(ordered.length).toBe(2);
  });
});

describe('ThreeRenderer (no GL)', () => {
  it('builds a scene graph without a canvas', () => {
    const r = new ThreeRenderer();
    const scene = r.buildScene([square().setFill('#fff', 1)]);
    // background + one mobject group
    expect(scene.children.length).toBe(1);
  });

  it('render() requires attach()', () => {
    const r = new ThreeRenderer();
    expect(() => r.render([square()])).toThrow(/attach/);
  });

  it('buildMobject returns a group carrying the mobject', () => {
    const r = new ThreeRenderer();
    const vm = square().setStroke('#fff', 4, 1);
    const obj = r.buildMobject(vm);
    expect(obj.userData.mobject).toBe(vm);
  });
});

describe('shader #INSERT resolver', () => {
  it('splices named snippets', () => {
    const out = resolveInserts('a\n#INSERT foo\nb', { foo: 'X\nY' });
    expect(out).toBe('a\nX\nY\nb');
  });

  it('resolves recursively and de-dupes repeated inserts', () => {
    const out = resolveInserts('#INSERT a\n#INSERT a', { a: 'hi' });
    expect(out).toBe('hi\n');
  });

  it('throws on unknown insert', () => {
    expect(() => resolveInserts('#INSERT nope', {})).toThrow(/Unknown/);
  });

  it('dedupeUniforms keeps first of each', () => {
    const glsl = 'uniform float t;\nuniform float t;\nuniform vec3 c;';
    expect(dedupeUniforms(glsl)).toBe('uniform float t;\nuniform vec3 c;');
  });
});
