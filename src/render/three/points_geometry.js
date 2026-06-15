// Adapts a PMobject/DotCloud onto native THREE.Points (docs/02).
// Each point carries a world-space `radius`; a small shader converts that radius
// to a pixel point-size that's correct under both the orthographic (2D) and
// perspective (3D) cameras, and renders a soft disc — or a radial glow when
// glowFactor > 0 (the web stand-in for manim's `true_dot` shader).

import * as THREE from 'three';

const hexTmp = new THREE.Vector2();

const VERT = /* glsl */ `
in float aRadius;
in vec4 aColor;
out vec4 vColor;
uniform float uViewportHeight;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // radius (world) -> diameter (pixels); works for ortho (w=1) and perspective.
  gl_PointSize = aRadius * abs(projectionMatrix[1][1]) / gl_Position.w * uViewportHeight;
}
`;

const FRAG = /* glsl */ `
in vec4 vColor;
out vec4 fragColor;
uniform float uGlowFactor;
void main() {
  vec2 d = 2.0 * gl_PointCoord - 1.0;
  float r = length(d);
  float alpha;
  if (uGlowFactor > 0.0) {
    if (r > 1.0) discard;
    alpha = pow(max(1.0 - r, 0.0), uGlowFactor);
  } else {
    float aa = fwidth(r);
    alpha = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
    if (alpha <= 0.0) discard;
  }
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;

const DEFAULT_POINT_RADIUS = 0.04;

/** THREE.Points for a point cloud, or null if it has no points. */
export function buildPoints(mob) {
  const n = mob.getNumPoints();
  if (n === 0) return null;

  const positions = new Float32Array(mob.data.get('point').subarray(0, n * 3));
  const colors = new Float32Array(mob.data.get('rgba').subarray(0, n * 4));
  const radii = mob.data.columns.has('radius')
    ? new Float32Array(mob.data.get('radius').subarray(0, n))
    : new Float32Array(n).fill(DEFAULT_POINT_RADIUS);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 4));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));

  const glow = mob.glowFactor ?? 0;
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uViewportHeight: { value: 1080 },
      uGlowFactor: { value: glow },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: glow > 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  // Keep the point size correct regardless of the canvas's actual pixel height.
  points.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(hexTmp);
    material.uniforms.uViewportHeight.value = hexTmp.y;
  };
  points.renderOrder = mob.zIndex;
  return points;
}

/** Full Three.js representation of a point cloud (points wrapped in a group). */
export function buildPointsObject3D(mob) {
  const group = new THREE.Group();
  group.userData.mobject = mob;
  const points = buildPoints(mob);
  if (points) group.add(points);
  group.renderOrder = mob.zIndex;
  return group;
}
