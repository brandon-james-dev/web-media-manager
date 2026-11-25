# Web Media Manager Plugin Specification

Status: **Draft for review** · Manifest version `1` · Manifest file `manifest.json`

This folder is the specification for WMM plugin packages. It is written for
three audiences: plugin authors, the people who maintain the plugin host, and
the app engineers who add a new plugin kind.

## Documents

| # | Document | Covers |
|---|----------|--------|
| 01 | [Package and manifest](01-package-and-manifest.md) | ZIP layout, `manifest.json`, kinds, settings, validation codes, archive limits |
| 02 | [Lyrics providers](02-lyrics-providers.md) | `kind: "lyrics"`, the `provider.search` descriptor, ranking |
| 03 | [Music sources](03-music-sources.md) | `kind: "source"`, the `provider.library`/`provider.stream` descriptor, the WebDAV example |
| 04 | [Visualizers](04-visualizers.md) | `kind: "visualizer"`, runtimes, entry files, shader uniforms |

## The contract in one page

- A plugin is a **ZIP** containing `manifest.json` at its root. Nothing else is
  required: a declarative plugin ships a manifest and no code.
- `manifest.json` is the single source of truth. The host lists, validates,
  loads and configures a plugin from it and never guesses from file names.
  Unknown fields are ignored, so an older app can install a newer manifest.
- There are two shapes of plugin:
  - **Executable** (`kind: "visualizer"`) names a `runtime` and an `entry`
    file, and the host mounts that code.
  - **Declarative** (`kind: "lyrics"`, `kind: "source"`) names no runtime and no
    entry. It describes what it contributes through a `provider` descriptor,
    and the host drives the requests itself. An installed declarative plugin
    never runs third-party code.
- One install, validate, store and remove pipeline serves every kind. The
  manager filters by `kind` for display; storage is shared.
- A plugin can never shadow a built-in provider id. The registry refuses the
  duplicate and the built-in keeps answering.
- The user can always get back to a working app: removing a plugin unregisters
  its providers, and a failed refresh leaves the built-in providers registered.

## Kinds

| `kind` | Executable | Contributes | Host |
|--------|-----------|-------------|------|
| `visualizer` | yes | a rendering runtime | `src/lib/visualizers` |
| `lyrics` | no | a lyrics provider | `src/lib/lyrics-providers/plugin` |
| `source` | no | a music source kind | `src/lib/sources/plugin` |
| `theme` | no | a theme package | `src/lib/themes` |
| `layout` | no | a theme layout | `src/lib/themes` |

`theme` and `layout` are carried by the theme pipeline and specified in
[`docs/themes/`](../themes/README.md); they share the manifest and the store but
not the provider descriptors.

## Where the code lives

| Path | Contents |
|------|----------|
| `src/core/visualizers/contracts` | `PluginManifest`, `PluginProvider`, `InstalledPlugin` — the manifest and descriptor types |
| `src/core/visualizers/manifest` | `validateManifest` and its issue codes |
| `src/core/visualizers/PluginManager.ts` | install, inspect, list, remove, load, settings |
| `src/core/ports/visualizers.ts` | the `VisualizerPluginStore` port |
| `src/lib/packages/zip` | the fflate ZIP reader with path and size limits |
| `src/lib/visualizers` | runtime hosts, `initializePlugins`, example seeding |
| `src/lib/lyrics-providers/plugin` | `PluginLyricsService`, registry refresh |
| `src/lib/sources/plugin` | `PluginSourceStrategy`, registry refresh |
| `src/components/plugin-manager` | the kind-filtered install/manage dialog |

The manager is framework-free and lives in core; the dialog is a thin React
shell over it. `src/components/plugin-manager` is shared by every kind, which is
why it does not sit under `components/visualizer`.

## Adding a new plugin kind

1. Add the kind to `PluginKind` in `PluginManifest.ts`.
2. Add a descriptor to the `PluginProviderDescriptor` union with an
   `isPluginXProvider` guard.
3. Validate it in `validateManifest` under the `provider-invalid` code.
4. Add a host in `src/lib/<area>/plugin` that reads the descriptor and drives
   the work, plus a registry and a refresh function.
5. Call the refresh from `initializePlugins` and from the install and remove
   mutations, so the registry tracks the installed set.
6. Add the dialog copy to `PLUGIN_DIALOG_COPY` and the strings to
   `src/i18n/resources.ts`, then run `npm run i18n:sync`.
