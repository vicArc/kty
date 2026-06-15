import { describe, it, expect } from 'vitest';
import { toSVG } from '../../src/export/svg.js';
import { Circle, Square } from '../../src/mobject/geometry.js';
import { DotCloud } from '../../src/mobject/point_cloud.js';
import { Sphere } from '../../src/mobject/three_dimensions.js';

describe('toSVG', () => {
  it('emits an <svg> with a viewBox and fill path for a filled shape', () => {
    const svg = toSVG([new Square({ sideLength: 2, fillColor: '#FF0000', fillOpacity: 1 })]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('<path');
    expect(svg).toContain('fill="#FF0000"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('scale(1 -1)'); // world y-up → SVG y-down
  });

  it('emits a stroke path with world-unit stroke width', () => {
    const svg = toSVG([new Circle({ radius: 1, strokeColor: '#00FF00', strokeWidth: 4 })]);
    expect(svg).toContain('stroke="#00FF00"');
    expect(svg).toContain('fill="none"');
    expect(svg).toMatch(/stroke-width="[\d.]+"/);
  });

  it('renders DotCloud points as <circle> elements', () => {
    const svg = toSVG([
      new DotCloud({
        points: [
          [0, 0, 0],
          [1, 1, 0],
        ],
        radius: 0.1,
        color: '#0000FF',
      }),
    ]);
    expect((svg.match(/<circle/g) || []).length).toBe(2);
    expect(svg).toContain('r="0.1"');
  });

  it('skips 3D surfaces (not vector-exportable)', () => {
    const svg = toSVG([new Sphere({ radius: 1, resolution: [8, 6] })]);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<path');
    expect(svg).not.toContain('<circle');
  });

  it('includes a background rect when requested', () => {
    const svg = toSVG([new Square({ sideLength: 1 })], { background: '#333333' });
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#333333"');
  });

  it('uses the camera frame for the viewBox', () => {
    const svg = toSVG([new Square({ sideLength: 1 })], { width: 800, height: 450 });
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="450"');
  });
});
