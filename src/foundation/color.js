// Port of the core of manimlib/utils/color.py.
// Colors are hex strings ("#RRGGBB") or rgb arrays [r,g,b] in 0..1.
// HSL interpolation and matplotlib colormaps are deferred to Stage 6.

/** "#RRGGBB" → [r, g, b] in 0..1. */
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(h, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

/** [r, g, b] in 0..1 → "#RRGGBB" (uppercase). */
export function rgbToHex(rgb) {
  const toByte = (c) => Math.round(Math.max(0, Math.min(1, c)) * 255);
  return (
    '#' +
    rgb
      .slice(0, 3)
      .map((c) => toByte(c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** Accepts a hex string or an rgb(a) array, returns [r, g, b] in 0..1. */
export function colorToRgb(color) {
  if (typeof color === 'string') return hexToRgb(color);
  if (Array.isArray(color)) return color.slice(0, 3);
  throw new Error('Invalid color type');
}

export function colorToRgba(color, alpha = 1.0) {
  return [...colorToRgb(color), alpha];
}

export function colorToIntRgb(color) {
  return colorToRgb(color).map((c) => Math.round(255 * c));
}

export function invertColor(color) {
  return rgbToHex(colorToRgb(color).map((c) => 1 - c));
}

/**
 * Blend two colors at alpha. Matches manim's default: interpolate in
 * gamma-squared space (sqrt of the linear blend of squared channels).
 * @returns {string} hex
 */
export function interpolateColor(color1, color2, alpha) {
  const a = colorToRgb(color1);
  const b = colorToRgb(color2);
  const rgb = a.map((c, i) => Math.sqrt((1 - alpha) * c * c + alpha * b[i] * b[i]));
  return rgbToHex(rgb);
}

/** A gradient of `length` colors sampled across the reference colors. */
export function colorGradient(referenceColors, length) {
  if (length === 0) return [];
  const refs = [...referenceColors];
  if (refs.length === 1) return Array.from({ length }, () => rgbToHex(colorToRgb(refs[0])));
  const out = [];
  for (let i = 0; i < length; i++) {
    const alpha = (i * (refs.length - 1)) / (length - 1);
    let floor = Math.floor(alpha);
    let mod = alpha - floor;
    if (i === length - 1) {
      floor = refs.length - 2;
      mod = 1;
    }
    out.push(interpolateColor(refs[floor], refs[floor + 1], mod));
  }
  return out;
}

/** Perceptual-ish average (root-mean-square of channels). */
export function averageColor(...colors) {
  const rgbs = colors.map(colorToRgb);
  const mean = [0, 1, 2].map((j) =>
    Math.sqrt(rgbs.reduce((s, c) => s + c[j] * c[j], 0) / rgbs.length)
  );
  return rgbToHex(mean);
}
