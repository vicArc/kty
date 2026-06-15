import { describe, it, expect } from 'vitest';
import { ImageMobject } from '../../src/mobject/image_mobject.js';
import { buildImageMesh } from '../../src/render/three/image_geometry.js';

describe('ImageMobject', () => {
  it('routes to the image render path', () => {
    expect(new ImageMobject('x.png', { width: 4, height: 4 }).renderType).toBe('image');
  });

  it('sizes the quad to the given width/height', () => {
    const im = new ImageMobject('x.png', { width: 6, height: 4 });
    expect(im.getWidth()).toBeCloseTo(6, 5);
    expect(im.getHeight()).toBeCloseTo(4, 5);
    expect(im.getNumPoints()).toBe(4);
  });

  it('infers aspect from a source with pixel dimensions', () => {
    const fakeImg = { width: 200, height: 100 }; // 2:1
    const im = new ImageMobject(fakeImg, { height: 3 });
    expect(im.getHeight()).toBeCloseTo(3, 5);
    expect(im.getWidth()).toBeCloseTo(6, 5); // 3 * (200/100)
  });

  it('falls back to square when aspect is unknown', () => {
    const im = new ImageMobject('x.png', { height: 5 });
    expect(im.getWidth()).toBeCloseTo(5, 5);
  });

  it('setColor is a no-op (the texture is the color)', () => {
    const im = new ImageMobject('x.png', { width: 2, height: 2 });
    expect(im.setColor('#FF0000')).toBe(im);
  });

  it('builds a 2-triangle textured mesh', () => {
    // Use a non-DOM source so the texture path doesn't need a browser here.
    const im = new ImageMobject({ width: 4, height: 4 }, { width: 4, height: 4 });
    const mesh = buildImageMesh(im);
    expect(mesh.isMesh).toBe(true);
    expect(mesh.geometry.attributes.position.count).toBe(6); // two triangles
    expect(mesh.geometry.attributes.uv.count).toBe(6);
    expect(mesh.material.map).toBeTruthy();
  });
});
