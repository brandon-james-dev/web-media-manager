# 04 · Visualizers

Covers `kind: "visualizer"`: the executable plugin shape, the runtimes, entry
files, shader uniforms and the canvas module contract.

## 1. Manifest

```json
{
  "id": "aurora",
  "name": "Aurora",
  "version": "0.1.1",
  "kind": "visualizer",
  "runtime": "canvas2d-typescript",
  "entry": "index.ts",
  "thumbnail": "thumbnail.png",
  "author": "Web Media Manager",
  "description": "Soft artwork-colored light fields, a dot grid and a bottom vignette.",
  "settings": [
    { "key": "intensity", "label": "Intensity", "type": "number", "default": 1, "min": 0.2, "max": 2, "step": 0.1 },
    { "key": "dots", "label": "Dot grid", "type": "boolean", "default": true }
  ]
}
```

A visualizer is the only executable kind: it names a `runtime` and an `entry`
file, and the host mounts that code. It must not carry a `provider`.

## 2. Runtimes

| `runtime` | Entry extensions | Implemented | Mounts |
|-----------|------------------|-------------|--------|
| `webgl-shader` | `.glsl`, `.frag`, `.fs` | yes | `ShaderHost` |
| `canvas2d-typescript` | `.ts`, `.js`, `.mjs` | yes | `CanvasHost` |
| `wasm` | `.wasm` | no | reserved |

`entry-extension-mismatch` fires when the entry file's extension is not in the
runtime's list. `runtime-unsupported` fires for a declared but unimplemented
runtime, so the install fails with a clear message instead of failing later at
load time.

`createRuntimeHost` is the only runtime switch in the app. Adding a runtime is a
new descriptor in `VisualizerRuntime.ts` plus a host factory; nothing else
branches on the runtime id.

## 3. `webgl-shader`

The entry file is a fragment shader. The host compiles it and feeds these
uniforms every frame:

| Uniform | Type | Meaning |
|---------|------|---------|
| `uTime` | float | Seconds since the host mounted. |
| `uResolution` | vec2 | Drawing buffer size in pixels. |
| `uBass` | float | Low-band energy, 0..1. |
| `uMid` | float | Mid-band energy, 0..1. |
| `uTreble` | float | High-band energy, 0..1. |
| `uVolume` | float | Overall level, 0..1. |
| `uFFT[256]` | float[256] | Frequency magnitudes. |
| `uWaveform[256]` | float[256] | Time-domain samples. |

An optional `vertex` file supplies the vertex shader; without one the host uses
its own. `vertex-unused` warns when `vertex` is set on a runtime that does not
read it.

## 4. `canvas2d-typescript`

The entry file is an ES module. The host reads it, strips TypeScript with a
lazily imported sucrase, and imports the result from a Blob URL. The module
default-exports the mount function the host calls with the canvas and the
analysis frame source.

Because the module is imported from a Blob URL, it cannot use relative imports:
everything it needs arrives through the mount argument.

## 5. Settings

`settings` descriptors are validated under `settings-invalid` and rendered in
the visualizer settings panel. Values are stored per plugin through the
`VisualizerPluginStore` port, survive a restart, and `resetSettings` restores
every default. The now-playing panel only renders the active plugin; management
and settings live on `/settings`.

## 6. Example

`examples/visualizers/aurora`, packed to `public/plugins/aurora.zip` by
`npm run build:plugins`. It is a `canvas2d-typescript` plugin with six settings
and a thumbnail, and it is seeded on first run so a fresh install has something
to render.
