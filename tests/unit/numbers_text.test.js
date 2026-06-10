import { describe, it, expect } from 'vitest';
import { DecimalNumber, Integer } from '../../src/mobject/numbers.js';
import { Text, escapeLatex } from '../../src/mobject/svg/text_mobject.js';
import { Axes, NumberLine } from '../../src/index.js';
import { ChangeDecimalToValue, CountInFrom } from '../../src/animation/numbers.js';

describe('DecimalNumber', () => {
  it('formats with decimal places and renders glyphs', () => {
    const d = new DecimalNumber(3.14159, { numDecimalPlaces: 2 });
    expect(d.getNumString(3.14159)).toBe('3.14');
    expect(d.submobjects.length).toBeGreaterThan(0); // glyphs rendered
    expect(d.getValue()).toBeCloseTo(3.14159, 5);
  });

  it('groups thousands with commas', () => {
    const d = new DecimalNumber(0, { numDecimalPlaces: 0 });
    expect(d.getNumString(1234567)).toBe('1,234,567');
  });

  it('includeSign adds a leading +', () => {
    const d = new DecimalNumber(0, { numDecimalPlaces: 0, includeSign: true });
    expect(d.getNumString(5)).toBe('+5');
  });

  it('setValue updates the value and re-renders', () => {
    const d = new DecimalNumber(1, { numDecimalPlaces: 0 });
    const before = d.submobjects.length;
    d.setValue(888);
    expect(d.getValue()).toBe(888);
    expect(d.submobjects.length).toBeGreaterThanOrEqual(before);
  });

  it('Integer rounds', () => {
    const i = new Integer(7.8);
    expect(i.getValue()).toBe(8);
    expect(i.getNumString(7.8)).toBe('8');
  });
});

describe('Text', () => {
  it('escapes LaTeX special characters', () => {
    expect(escapeLatex('a & b % c')).toBe('a \\& b \\% c');
  });

  it('renders text into glyphs', () => {
    const t = new Text('Hi');
    expect(t.submobjects.length).toBeGreaterThan(0);
    expect(t.text).toBe('Hi');
  });
});

describe('axis tick labels', () => {
  it('NumberLine.addNumbers labels ticks (excluding 0)', () => {
    const nl = new NumberLine({ xRange: [-2, 2, 1] });
    const numbers = nl.addNumbers();
    expect(numbers.submobjects.length).toBe(4); // -2,-1,1,2 (0 excluded)
  });

  it('Axes.addCoordinateLabels labels both axes', () => {
    const ax = new Axes({ xRange: [-2, 2, 1], yRange: [-2, 2, 1] });
    const labels = ax.addCoordinateLabels();
    expect(labels.submobjects.length).toBe(2); // x labels group + y labels group
    expect(ax.xAxis.numbers.submobjects.length).toBe(4);
  });
});

describe('number animations', () => {
  it('ChangeDecimalToValue interpolates the value', () => {
    const d = new DecimalNumber(0, { numDecimalPlaces: 0 });
    const anim = new ChangeDecimalToValue(d, 10);
    anim.begin();
    anim.interpolate(1);
    expect(d.getValue()).toBeCloseTo(10, 5);
  });

  it('CountInFrom counts up to the target', () => {
    const d = new Integer(5);
    const anim = new CountInFrom(d, 0);
    anim.begin();
    anim.interpolate(0);
    expect(d.getValue()).toBe(0);
    anim.interpolate(1);
    expect(d.getValue()).toBe(5);
  });
});
