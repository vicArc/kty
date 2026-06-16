import { describe, it, expect } from 'vitest';
import {
  rgbToHsl,
  hslToRgb,
  hsl,
  getColormap,
  getColormapColors,
  COLORMAPS,
} from '../../src/foundation/color.js';

describe('HSL', () => {
  it('builds primary colors from hue', () => {
    expect(hsl(0, 1, 0.5).toUpperCase()).toBe('#FF0000');
    expect(hsl(1 / 3, 1, 0.5).toUpperCase()).toBe('#00FF00');
    expect(hsl(2 / 3, 1, 0.5).toUpperCase()).toBe('#0000FF');
  });

  it('round-trips rgb → hsl → rgb', () => {
    for (const c of [
      [0.2, 0.5, 0.9],
      [0.8, 0.1, 0.4],
      [0.5, 0.5, 0.5],
      [0, 0, 0],
      [1, 1, 1],
    ]) {
      const back = hslToRgb(rgbToHsl(c));
      back.forEach((v, i) => expect(v).toBeCloseTo(c[i], 5));
    }
  });

  it('greys have zero saturation', () => {
    const [, s] = rgbToHsl([0.4, 0.4, 0.4]);
    expect(s).toBe(0);
  });
});

describe('colormaps', () => {
  it('maps endpoints to the first/last anchors', () => {
    const cmap = getColormap('viridis');
    expect(cmap(0).toUpperCase()).toBe(COLORMAPS.viridis[0]);
    expect(cmap(1).toUpperCase()).toBe(COLORMAPS.viridis.at(-1));
  });

  it('clamps out-of-range input', () => {
    const cmap = getColormap('magma');
    expect(cmap(-5)).toBe(cmap(0));
    expect(cmap(5)).toBe(cmap(1));
  });

  it('getColormapColors returns n colors spanning the map', () => {
    const cols = getColormapColors('coolwarm', 5);
    expect(cols).toHaveLength(5);
    expect(cols[0].toUpperCase()).toBe(COLORMAPS.coolwarm[0]);
    expect(cols[4].toUpperCase()).toBe(COLORMAPS.coolwarm.at(-1));
  });

  it('accepts an explicit array of anchor colors', () => {
    const cmap = getColormap(['#000000', '#FFFFFF']);
    expect(cmap(0.5).toUpperCase()).toBe('#B4B4B4'); // gamma-squared midpoint
  });

  it('throws on an unknown colormap name', () => {
    expect(() => getColormap('not-a-map')).toThrow();
  });
});
