import { describe, it, expect } from 'vitest';
import {
  Checkmark,
  Exmark,
  Clock,
  ClockPassesTime,
  DieFace,
  Dartboard,
} from '../../src/mobject/svg/drawings.js';
import { AnnularSector, Sector, Annulus } from '../../src/mobject/geometry.js';
import { TAU } from '../../src/foundation/constants.js';

describe('AnnularSector / Sector / Annulus', () => {
  it('AnnularSector spans the outer radius as a single subpath', () => {
    const a = new AnnularSector({ innerRadius: 1, outerRadius: 2, angle: TAU / 2 });
    expect(a.getSubpaths()).toHaveLength(1);
    expect(a.getWidth()).toBeCloseTo(4, 1); // half-ring of radius 2 → width ~4
  });

  it('Sector is a wedge from the centre (one subpath)', () => {
    const s = new Sector({ radius: 2, angle: TAU / 4 });
    expect(s.getSubpaths()).toHaveLength(1);
    expect(s.getNumPoints()).toBeGreaterThan(0);
  });

  it('Annulus is a full ring', () => {
    const a = new Annulus({ innerRadius: 1, outerRadius: 2 });
    expect(a.getWidth()).toBeCloseTo(4, 1);
    expect(a.getHeight()).toBeCloseTo(4, 1);
  });
});

describe('Checkmark / Exmark', () => {
  it('Checkmark is a single green stroke path', () => {
    const c = new Checkmark();
    expect(c.getNumPoints()).toBeGreaterThan(0);
    expect(c.getStrokeColor().toUpperCase()).toBe('#83C167');
  });
  it('Exmark is two crossing strokes', () => {
    const x = new Exmark();
    expect(x.getSubpaths()).toHaveLength(2);
    expect(x.getStrokeColor().toUpperCase()).toBe('#FC6255');
  });
});

describe('Clock', () => {
  it('has a face, two hands and twelve ticks', () => {
    const clk = new Clock();
    expect(clk.submobjects).toHaveLength(4); // circle, hour, minute, ticks
    expect(clk.ticks.submobjects).toHaveLength(12);
    expect(clk.minuteHand.getLength()).toBeGreaterThan(clk.hourHand.getLength());
  });
});

describe('ClockPassesTime', () => {
  it('rotates both hands, minute 12x the hour', () => {
    const cpt = new ClockPassesTime(new Clock(), { hoursPassed: 6 });
    expect(cpt.animations).toHaveLength(2);
    expect(cpt.animations[1].angle).toBeCloseTo(12 * cpt.animations[0].angle, 6);
  });
});

describe('DieFace', () => {
  it('shows the right pip count for each value', () => {
    for (let v = 1; v <= 6; v++) expect(new DieFace(v).dots.submobjects).toHaveLength(v);
  });
  it('rejects out-of-range values', () => {
    expect(() => new DieFace(0)).toThrow();
    expect(() => new DieFace(7)).toThrow();
  });
});

describe('Dartboard', () => {
  it('builds three rings of sectors plus two bullseyes', () => {
    const db = new Dartboard();
    expect(db.submobjects.length).toBe(5); // 3 ring-groups + 2 bullseyes
    // 3 bands * 20 sectors + 2 bullseye circles, flattened
    expect(db.familyMembersWithPoints().length).toBe(62);
    expect(db.bullseye).toBeTruthy();
    expect(db.getWidth()).toBeCloseTo(6, 0); // radius 3 → diameter ~6
  });
});
