# 05 — Web Improvements

Things kty can do _better_ than desktop ManimGL precisely because it runs on the web. These are opportunities, not blockers — most land in Stage 8–9 but should shape earlier design decisions.

## Authoring & iteration

- **Zero-install, shareable.** A scene is a URL. No Python, LaTeX, ffmpeg, or Pango install. Open a link → it runs.
- **True hot reload.** Vite HMR + a live editor replaces the IPython `embed`/`reload_scene`/`checkpoint_paste` dance. Edit a `play()` call, see it re-run with state preserved — manim's interactive loop, but in a browser with a real editor (Monaco/CodeMirror), inline errors, and autocomplete.
- **Embeddable.** Ship an `<kty-scene src="...">` web component so blog posts and docs embed live, interactive animations (scrub, pause, replay) instead of baked MP4s.
- **Time-travel debugging.** The engine already keeps undo state (`get_state`/`restore_state`). Expose a scrubber/timeline so authors can step animations forward/back — far better than re-rendering from `-n`.

## Interactivity (the real differentiator)

- **Live manipulation.** `InteractiveScene` + raycasting means viewers (not just authors) can drag mobjects, tweak `ValueTracker`s via sliders, and rotate 3D scenes. Desktop manim's interactivity is author-only; the web makes it audience-facing.
- **Reactive parameters.** Bind HTML controls (sliders, color pickers, number inputs) to `ValueTracker`s and updaters for explorable explanations.
- **Responsive canvas.** Reflow to container size / device-pixel-ratio; the `CameraFrame` already abstracts the viewport, so this is mostly free.

## Rendering & performance

- **GPU instancing by default.** Native `THREE.InstancedMesh`/`Line2` for repeated mobjects (dot grids, tick marks, vector fields) — often cheaper than manim's per-object draws.
- **Adaptive quality.** Sample bezier resolution and AA to the device; throttle to a power-saving cadence when idle; pause rendering when the canvas scrolls offscreen (`IntersectionObserver`).
- **Optional WebGPU backend.** The `RenderBackend` seam ([doc 01](./01-target-architecture.md)) lets a WebGPU `WebGPURenderer` drop in later, reclaiming compute-shader geometry expansion for the few fidelity cases that want it.

## Export & distribution

- **In-browser video export** via WebCodecs (`VideoEncoder` + `mp4-muxer`) — no ffmpeg. Transparent export via WebM-alpha / `.mov`.
- **Vector export.** Because fills/strokes originate from `THREE.Shape`/SVG paths, we can export crisp **SVG/PDF** of a frame, which desktop manim can't do from its rasterized GL pipeline.
- **Deterministic export driver.** Fixed-`dt` stepping decoupled from wall-clock guarantees frame-accurate output regardless of machine speed.

## Accessibility & reach

- **Semantic layer.** Attach alt-text/ARIA descriptions to mobjects; optionally emit an accessible DOM mirror of on-screen Tex (MathML from MathJax) for screen readers — impossible with a video.
- **Mobile/touch.** Pan/zoom/drag via pointer events; runs on phones and tablets.
- **Theming.** Light/dark and color-blind-safe palettes at runtime, since colors are config-driven.

## Caveats to set expectations

- **Fonts & glyph outlines differ** from LaTeX/Pango rasterization → target perceptual, not pixel, parity.
- **WebCodecs/WebGPU availability varies** by browser → feature-detect with graceful fallback (MediaRecorder; WebGL2).
- **Heavy scenes** that stream millions of points need budget discipline (instancing, culling, attribute reuse) — see Stage 9.
