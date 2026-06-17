// Adapts an ImageMobject onto a textured THREE.Mesh (docs/02). The four corner
// points (UL, UR, DR, DL) become two triangles; `mob.src` becomes a texture
// (URL → TextureLoader, canvas → CanvasTexture, image → Texture). Textures are
// cached by source so the per-frame scene rebuild doesn't reload them.

import * as THREE from 'three';

const textureCache = new Map();

export function getTexture(src) {
  if (textureCache.has(src)) return textureCache.get(src);
  let tex;
  if (typeof src === 'string') {
    tex = new THREE.TextureLoader().load(src);
  } else if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) {
    tex = new THREE.CanvasTexture(src);
  } else {
    tex = new THREE.Texture(src);
    tex.needsUpdate = true;
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(src, tex);
  return tex;
}

/** Textured quad mesh for an ImageMobject. */
export function buildImageMesh(mob) {
  const [ul, ur, dr, dl] = mob.getPoints();
  // Two triangles: (UL, DL, UR) and (UR, DL, DR).
  const positions = new Float32Array([...ul, ...dl, ...ur, ...ur, ...dl, ...dr]);
  // UVs chosen so the image's top row lands at the +y (UL) edge.
  const uvs = new Float32Array([0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const material = new THREE.MeshBasicMaterial({
    map: getTexture(mob.src),
    transparent: true,
    opacity: mob.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = mob.zIndex;
  return mesh;
}

/** Full Three.js representation of an ImageMobject (mesh wrapped in a group). */
export function buildImageObject3D(mob) {
  const group = new THREE.Group();
  group.userData.mobject = mob;
  group.add(buildImageMesh(mob));
  group.renderOrder = mob.zIndex;
  return group;
}
