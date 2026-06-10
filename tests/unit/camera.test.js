import { describe, it, expect } from 'vitest';
import { CameraFrame } from '../../src/camera/camera_frame.js';
import { Camera } from '../../src/camera/camera.js';
import { FRAME_WIDTH, FRAME_HEIGHT } from '../../src/foundation/constants.js';

describe('CameraFrame', () => {
  it('defaults to the manim frame shape', () => {
    const f = new CameraFrame();
    const [w, h] = f.getFrameShape();
    expect(w).toBeCloseTo(FRAME_WIDTH, 6);
    expect(h).toBeCloseTo(FRAME_HEIGHT, 6);
  });

  it('pans with moveTo and zooms with scale', () => {
    const f = new CameraFrame();
    f.moveTo([2, 1, 0]);
    expect(f.getCenter()[0]).toBeCloseTo(2, 9);
    f.setFrameScale(0.5);
    expect(f.getFrameShape()[1]).toBeCloseTo(FRAME_HEIGHT / 2, 6);
    expect(f.getCenter()[0]).toBeCloseTo(2, 9); // scale about center keeps center
  });
});

describe('Camera', () => {
  it('syncs an orthographic camera to the frame', () => {
    const cam = new Camera();
    const tc = cam.makeThreeCamera();
    expect(tc.left).toBeCloseTo(-FRAME_WIDTH / 2, 6);
    expect(tc.right).toBeCloseTo(FRAME_WIDTH / 2, 6);
    expect(tc.top).toBeCloseTo(FRAME_HEIGHT / 2, 6);
  });

  it('reflects frame pan/zoom into the camera bounds', () => {
    const cam = new Camera();
    cam.getFrame().moveTo([3, 0, 0]).setFrameScale(0.5);
    const tc = cam.makeThreeCamera();
    expect(tc.right - tc.left).toBeCloseTo(FRAME_WIDTH / 2, 6);
    expect(tc.position.x).toBeCloseTo(3, 6);
  });
});
