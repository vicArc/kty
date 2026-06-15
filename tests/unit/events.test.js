import { describe, it, expect } from 'vitest';
import { Mobject, Group } from '../../src/mobject/mobject.js';
import { findMobject, dispatchToMobject } from '../../src/interaction/events.js';

describe('Mobject event listeners', () => {
  it('registers, reads, and removes listeners', () => {
    const m = new Mobject();
    const fn = () => {};
    m.onClick(fn);
    expect(m.hasEventListeners('click')).toBe(true);
    expect(m.getEventListeners('click')).toContain(fn);
    m.removeEventListener('click', fn);
    expect(m.hasEventListeners('click')).toBe(false);
  });

  it('onHover registers enter and optional leave', () => {
    const m = new Mobject();
    m.onHover(
      () => {},
      () => {}
    );
    expect(m.hasEventListeners('hover:enter')).toBe(true);
    expect(m.hasEventListeners('hover:leave')).toBe(true);
  });

  it('hasEventListeners() with no type reports any listener', () => {
    const m = new Mobject();
    expect(m.hasEventListeners()).toBe(false);
    m.onDrag(() => {});
    expect(m.hasEventListeners()).toBe(true);
  });
});

describe('findMobject', () => {
  it('walks up parents to the owning mobject', () => {
    const mob = new Mobject();
    const child = { userData: {}, parent: { userData: { mobject: mob }, parent: null } };
    expect(findMobject(child)).toBe(mob);
  });

  it('returns null when nothing owns the object', () => {
    expect(findMobject({ userData: {}, parent: null })).toBe(null);
  });
});

describe('dispatchToMobject', () => {
  it('fires the target handler with the event payload', () => {
    const m = new Mobject();
    let got = null;
    m.onClick((e) => (got = e));
    dispatchToMobject(m, 'click', { point: [1, 2, 0], native: { x: 1 } });
    expect(got.type).toBe('click');
    expect(got.mobject).toBe(m);
    expect(got.point).toEqual([1, 2, 0]);
  });

  it('bubbles to parents', () => {
    const parent = new Group();
    const child = new Mobject();
    parent.add(child);
    const order = [];
    child.onClick(() => order.push('child'));
    parent.onClick(() => order.push('parent'));
    dispatchToMobject(child, 'click', {});
    expect(order).toEqual(['child', 'parent']);
  });

  it('stopPropagation halts bubbling', () => {
    const parent = new Group();
    const child = new Mobject();
    parent.add(child);
    const order = [];
    child.onClick((e) => {
      order.push('child');
      e.stopPropagation();
    });
    parent.onClick(() => order.push('parent'));
    dispatchToMobject(child, 'click', {});
    expect(order).toEqual(['child']);
  });

  it('sets currentMobject as it bubbles', () => {
    const parent = new Group();
    const child = new Mobject();
    parent.add(child);
    const seen = [];
    child.onClick((e) => seen.push(e.currentMobject));
    parent.onClick((e) => seen.push(e.currentMobject));
    dispatchToMobject(child, 'click', {});
    expect(seen).toEqual([child, parent]);
  });
});
