import { describe, it, expect } from 'vitest';
import { VMobject } from '../../src/mobject/vmobject.js';
import { quadraticBezierPointsForArc } from '../../src/foundation/bezier.js';
import { TAU } from '../../src/foundation/constants.js';
import {
  vmobjectToShapes,
  vmobjectToPolylines,
  buildFillMesh,
  buildStrokeLines,
  buildVMobjectObject3D,
} from '../../src/render/three/vmobject_geometry.js';

const square = () =>
  new VMobject().setPointsAsCorners([
    [-1, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
  ]);
const circle = () => new VMobject().setPointsAsQuads(quadraticBezierPointsForArc(TAU));

describe('vmobject geometry builders', () => {
  it('vmobjectToShapes makes one THREE.Shape per subpath', () => {
    const shapes = vmobjectToShapes(square());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('Shape');
    // The shape outlines the unit square.
    const pts = shapes[0].getPoints(4);
    expect(pts.length).toBeGreaterThan(0);
  });

  it('vmobjectToPolylines samples each quadratic', () => {
    const lines = vmobjectToPolylines(square(), 8);
    expect(lines).toHaveLength(1);
    // 4 segments * 8 samples + 1 start = 33 points * 3 coords
    expect(lines[0].length).toBe(33 * 3);
  });

  it('buildFillMesh is null without fill, a Mesh with fill', () => {
    expect(buildFillMesh(square())).toBeNull();
    const filled = square().setFill('#00FF00', 1);
    const mesh = buildFillMesh(filled);
    expect(mesh.isMesh).toBe(true);
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(mesh.material.opacity).toBe(1);
  });

  it('buildStrokeLines produces Line2 objects', () => {
    const stroke = buildStrokeLines(square(), [1920, 1080]);
    expect(stroke.children.length).toBe(1);
    expect(stroke.children[0].isLine2).toBe(true);
  });

  it('buildVMobjectObject3D groups fill + stroke', () => {
    const vm = circle().setFill('#58C4DD', 1).setStroke('#FFFFFF', 4, 1);
    const obj = buildVMobjectObject3D(vm);
    // one fill mesh group child + one stroke group child
    expect(obj.children.length).toBe(2);
    expect(obj.userData.mobject).toBe(vm);
  });

  it('renderOrder follows zIndex', () => {
    const vm = square().setFill('#fff', 1);
    vm.setZIndex(7);
    expect(buildFillMesh(vm).renderOrder).toBe(7);
  });
});
