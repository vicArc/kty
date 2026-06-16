// Port of the core of manimlib/utils/color.py.
// Colors are hex strings ("#RRGGBB") or rgb arrays [r,g,b] in 0..1.

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

// --- HSL (S1.3) — h, s, l all in 0..1 ---

/** [r, g, b] (0..1) → [h, s, l] (0..1). */
export function rgbToHsl(rgb) {
  const [r, g, b] = colorToRgb(rgb);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

/** [h, s, l] (0..1) → [r, g, b] (0..1). */
export function hslToRgb([h, s, l]) {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

/** Build a hex color from h, s, l (0..1). */
export function hsl(h, s, l) {
  return rgbToHex(hslToRgb([h, s, l]));
}

// --- Colormaps (S1.3) — anchor-based approximations of matplotlib maps ---

export const COLORMAPS = {
  viridis: ['#440154', '#414487', '#2A788E', '#22A884', '#7AD151', '#FDE725'],
  magma: ['#000004', '#3B0F70', '#8C2981', '#DE4968', '#FE9F6D', '#FCFDBF'],
  inferno: ['#000004', '#420A68', '#932667', '#DD513A', '#FCA50A', '#FCFFA4'],
  plasma: ['#0D0887', '#6A00A8', '#B12A90', '#E16462', '#FCA636', '#F0F921'],
  coolwarm: ['#3B4CC0', '#7B9FF9', '#C2C2C2', '#F6A385', '#B40426'],
  jet: ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF0000', '#800000'],
  rainbow: ['#6E40AA', '#417DE0', '#1AC7C2', '#52F667', '#D2E935', '#FF8C38', '#E5414E'],
  grey: ['#000000', '#FFFFFF'],
  gray: ['#000000', '#FFFFFF'],
  '3b1b_colormap': ['#236B8E', '#83C167', '#FFFF00', '#FC6255'],
};

/** Resolve a colormap name (or array of anchor colors) to anchor colors. */
function resolveColormap(name) {
  const anchors = Array.isArray(name) ? name : COLORMAPS[name];
  if (!anchors) throw new Error(`Unknown colormap: ${name}`);
  return anchors;
}

/** A colormap as a function `t in [0,1] -> hex`. Accepts a name or color array. */
export function getColormap(name) {
  const anchors = resolveColormap(name);
  return (t) => {
    const tt = Math.max(0, Math.min(1, t));
    if (anchors.length === 1) return rgbToHex(colorToRgb(anchors[0]));
    const x = tt * (anchors.length - 1);
    const i = Math.min(Math.floor(x), anchors.length - 2);
    return interpolateColor(anchors[i], anchors[i + 1], x - i);
  };
}

/** `n` evenly-sampled colors from a colormap (name or color array). */
export function getColormapColors(name, n = 256) {
  return colorGradient(resolveColormap(name), n);
}
