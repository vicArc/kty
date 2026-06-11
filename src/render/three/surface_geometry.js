// Adapts a Surface mobject onto a native THREE.Mesh (docs/02):
//   point column      -> BufferGeometry 'position'
//   triangle indices  -> geometry index
//   d_normal_point    -> per-vertex 'normal' (smooth shading; correct at poles)
// Lit with MeshStandardMaterial, so the ThreeRenderer adds lights when any
// surface is present. No WebGL context is needed to build this — only to render.

import * as THREE from 'three';

const hexToThree = (hex) => new THREE.Color(hex);

/** THREE.Mesh for a Surface, or null if it has no triangulated points. */
export function buildSurfaceMesh(surf) {
  const positions = surf.data.get('point');
  const indices = surf.getTriangleIndices();
  if (positions.length === 0 || indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(surf.getUnitNormals(), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

  const opacity = surf.getOpacity();
  const material = new THREE.MeshStandardMaterial({
    color: hexToThree(surf.getColor()),
    roughness: 0.5,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    opacity,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = surf.zIndex;
  return mesh;
}

/** Full Three.js representation of a Surface (mesh wrapped in a group, for uniformity). */
export function buildSurfaceObject3D(surf) {
  const group = new THREE.Group();
  group.userData.mobject = surf;
  const mesh = buildSurfaceMesh(surf);
  if (mesh) group.add(mesh);
  group.renderOrder = surf.zIndex;
  return group;
}
