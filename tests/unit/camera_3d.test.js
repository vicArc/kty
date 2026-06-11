import { describe, it, expect } from 'vitest';
import { CameraFrame } from '../../src/camera/camera_frame.js';
import { Camera } from '../../src/camera/camera.js';
import { DEGREES } from '../../src/foundation/constants.js';

describe('CameraFrame 3D orientation', () => {
  it('is orthographic (non-perspective) by default', () => {
    const f = new CameraFrame();
    expect(f.isPerspective()).toBe(false);
    expect(f.phi).toBe(0);
  });

  it('reorient sets degrees and flips to perspective when tilted', () => {
    const f = new CameraFrame();
    f.reorient(-30, 70);
    expect(f.theta).toBeCloseTo(-30 * DEGREES, 6);
    expect(f.phi).toBeCloseTo(70 * DEGREES, 6);
    expect(f.isPerspective()).toBe(true);
  });

  it('camera basis: identity orientation looks down +z with +y up', () => {
    const f = new CameraFrame();
    const { toCamera, up } = f.getCameraBasis();
    expect(toCamera[0]).toBeCloseTo(0, 6);
    expect(toCamera[1]).toBeCloseTo(0, 6);
    expect(toCamera[2]).toBeCloseTo(1, 6);
    expect(up[0]).toBeCloseTo(0, 6);
    expect(up[1]).toBeCloseTo(1, 6);
    expect(up[2]).toBeCloseTo(0, 6);
  });

  it('camera basis for phi rotates the eye off the z-axis', () => {
    const f = new CameraFrame();
    f.reorient(0, 70);
    const { toCamera } = f.getCameraBasis();
    // theta=0, phi → [0, -sin(phi), cos(phi)]
    expect(toCamera[0]).toBeCloseTo(0, 6);
    expect(toCamera[1]).toBeCloseTo(-Math.sin(70 * DEGREES), 6);
    expect(toCamera[2]).toBeCloseTo(Math.cos(70 * DEGREES), 6);
  });

  it('implied camera location is focalDistance away along toCamera', () => {
    const f = new CameraFrame();
    f.reorient(0, 0); // still front-on, but compute distance
    const eye = f.getImpliedCameraLocation();
    const dist = f.getFocalDistance();
    expect(eye[2]).toBeCloseTo(dist, 5);
    expect(dist).toBeGreaterThan(0);
  });
});

describe('Camera projection selection', () => {
  it('makes an OrthographicCamera for a flat frame', () => {
    const cam = new Camera();
    const three = cam.makeThreeCamera();
    expect(three.isOrthographicCamera).toBe(true);
  });

  it('makes a PerspectiveCamera once the frame is reoriented into 3D', () => {
    const cam = new Camera();
    cam.getFrame().reorient(-30, 70);
    const three = cam.makeThreeCamera();
    expect(three.isPerspectiveCamera).toBe(true);
    expect(three.fov).toBeCloseTo(45, 3);
  });
});
