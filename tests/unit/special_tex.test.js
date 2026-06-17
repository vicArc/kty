import { describe, it, expect } from 'vitest';
import { BulletedList, Title, TexTextFromPresetString } from '../../src/mobject/svg/special_tex.js';
import { FRAME_Y_RADIUS } from '../../src/foundation/constants.js';

describe('BulletedList', () => {
  it('makes one line per item, each marker + text', () => {
    const bl = new BulletedList('alpha', 'beta', 'gamma');
    expect(bl.submobjects).toHaveLength(3);
    bl.submobjects.forEach((line) => expect(line.submobjects.length).toBeGreaterThanOrEqual(2));
  });

  it('left-aligns the markers', () => {
    const bl = new BulletedList('one', 'two longer', 'three');
    const lefts = bl.submobjects.map((l) => l.getLeft()[0]);
    lefts.forEach((x) => expect(x).toBeCloseTo(lefts[0], 4));
  });

  it('fadeAllBut keeps one item opaque and dims the rest', () => {
    const bl = new BulletedList('a', 'b', 'c');
    bl.fadeAllBut(1);
    expect(bl.submobjects[1].getFillOpacity()).toBeCloseTo(1, 5);
    expect(bl.submobjects[0].getFillOpacity()).toBeLessThan(1);
  });
});

describe('Title', () => {
  it('pins to the top of the frame with an underline', () => {
    const t = new Title('Heading');
    expect(t.underline).toBeTruthy();
    expect(t.getTop()[1]).toBeGreaterThan(FRAME_Y_RADIUS - 1); // near the top edge
    // underline sits below the text
    expect(t.underline.getCenter()[1]).toBeLessThan(t.submobjects[0].getCenter()[1]);
  });

  it('omits the underline when asked', () => {
    const t = new Title('Heading', { includeUnderline: false });
    expect(t.underline).toBeUndefined();
  });

  it('matches the underline to text width when requested', () => {
    const textWidth = new Title('Hi', { includeUnderline: false }).getWidth();
    const t = new Title('Hi', { matchUnderlineWidthToText: true });
    expect(t.underline.getWidth()).toBeCloseTo(textWidth, 1);
  });
});

describe('TexTextFromPresetString', () => {
  it('renders the subclass preset tex', () => {
    class Preset extends TexTextFromPresetString {}
    Preset.tex = 'a+b';
    const p = new Preset();
    expect(p.familyMembersWithPoints().length).toBeGreaterThan(0);
  });
});
