import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  colorToRgb,
  colorToRgba,
  colorToIntRgb,
  invertColor,
  interpolateColor,
  colorGradient,
  averageColor,
} from '../../src/foundation/color.js';

describe('color', () => {
  it('hexToRgb / rgbToHex round-trip', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([1, 1, 1]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(rgbToHex([1, 0, 0])).toBe('#FF0000');
    expect(rgbToHex(hexToRgb('#58C4DD'))).toBe('#58C4DD');
  });

  it('short hex expands', () => {
    expect(hexToRgb('#FFF')).toEqual([1, 1, 1]);
  });

  it('colorToRgb / colorToRgba / colorToIntRgb', () => {
    expect(colorToRgb('#FF0000')).toEqual([1, 0, 0]);
    expect(colorToRgba('#FF0000', 0.5)).toEqual([1, 0, 0, 0.5]);
    expect(colorToIntRgb('#FF0000')).toEqual([255, 0, 0]);
  });

  it('invertColor', () => {
    expect(invertColor('#000000')).toBe('#FFFFFF');
    expect(invertColor('#FFFFFF')).toBe('#000000');
  });

  it('interpolateColor uses gamma-squared blend (manim default)', () => {
    // sqrt(0.5) * 255 ≈ 180 → 0xB4
    expect(interpolateColor('#000000', '#FFFFFF', 0.5)).toBe('#B4B4B4');
    expect(interpolateColor('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(interpolateColor('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
  });

  it('colorGradient endpoints match references', () => {
    const g = colorGradient(['#000000', '#FFFFFF'], 3);
    expect(g[0]).toBe('#000000');
    expect(g[2]).toBe('#FFFFFF');
    expect(g[1]).toBe('#B4B4B4');
    expect(colorGradient(['#FF0000'], 4)).toEqual(['#FF0000', '#FF0000', '#FF0000', '#FF0000']);
  });

  it('averageColor', () => {
    expect(averageColor('#000000', '#FFFFFF')).toBe('#B4B4B4');
  });
});
