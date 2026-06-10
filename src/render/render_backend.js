// Narrow render-backend contract (docs/01). The engine talks only to this; a
// future WebGPU backend can implement the same surface without touching engine
// code. Duck-typed base class — no TypeScript interface.

export class RenderBackend {
  /** Build a renderer-native object for a single Mobject. */
  buildMobject(_mob) {
    throw new Error('not implemented');
  }
  /** Re-upload changed data for an already-built object. */
  update(_handle, _mob) {
    throw new Error('not implemented');
  }
  /** Draw the ordered render groups for the given camera frame. */
  render(_mobjects, _camera, _target = null) {
    throw new Error('not implemented');
  }
}

/**
 * Flatten mobjects to their family members that have points, ordered by z_index
 * (stable) — manim's assemble_render_groups, minus the shader batching that
 * native Three.js objects make unnecessary.
 */
export function assembleRenderGroups(mobjects) {
  const members = [];
  for (const mob of mobjects) {
    for (const sm of mob.getFamily()) {
      if (sm.hasPoints()) members.push(sm);
    }
  }
  return members
    .map((m, i) => [m, i])
    .sort((a, b) => a[0].zIndex - b[0].zIndex || a[1] - b[1])
    .map(([m]) => m);
}
