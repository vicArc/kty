import { describe, it, expect } from 'vitest';
import { BarChart, SampleSpace } from '../../src/mobject/probability.js';

describe('BarChart', () => {
  it('builds one bar per value, taller for larger values', () => {
    const chart = new BarChart({ values: [0.2, 0.8, 0.5], maxValue: 1, height: 4 });
    expect(chart.bars.submobjects).toHaveLength(3);
    const h = chart.bars.submobjects.map((b) => b.getHeight());
    expect(h[1]).toBeGreaterThan(h[0]); // 0.8 bar taller than 0.2 bar
    expect(h[1]).toBeGreaterThan(h[2]);
  });

  it('adds bar names as labels', () => {
    const chart = new BarChart({ values: [1, 2, 3], maxValue: 3, barNames: ['a', 'b', 'c'] });
    expect(chart.barLabels.submobjects).toHaveLength(3);
  });

  it('changeBarValues restretches bars in place', () => {
    const chart = new BarChart({ values: [0.5, 0.5], maxValue: 1, height: 4 });
    const before = chart.bars.submobjects[0].getHeight();
    chart.changeBarValues([1.0, 0.5]);
    expect(chart.bars.submobjects[0].getHeight()).toBeGreaterThan(before);
  });
});

describe('SampleSpace', () => {
  it('divides horizontally into strips summing to the whole height', () => {
    const ss = new SampleSpace({ width: 3, height: 3 });
    ss.divideHorizontally([0.3, 0.5]); // completed with 0.2 → 3 strips
    expect(ss.horizontalParts.submobjects).toHaveLength(3);
    const total = ss.horizontalParts.submobjects.reduce((s, p) => s + p.getHeight(), 0);
    expect(total).toBeCloseTo(3, 4);
  });

  it('divides vertically into strips summing to the whole width', () => {
    const ss = new SampleSpace({ width: 4, height: 2 });
    ss.divideVertically([0.25, 0.25, 0.25, 0.25]);
    expect(ss.verticalParts.submobjects).toHaveLength(4);
    const total = ss.verticalParts.submobjects.reduce((s, p) => s + p.getWidth(), 0);
    expect(total).toBeCloseTo(4, 4);
  });
});
