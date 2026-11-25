# 01 · Package and manifest

Covers the ZIP layout, every `manifest.json` field, the settings descriptors,
the validation issue codes and the archive limits.

## 1. Package structure

```
my-plugin.zip
├── manifest.json          required, at the archive root
├── index.ts               executable plugins only, named by `entry`
├── shader.frag            optional, named by `vertex`
├── thumbnail.png          optional, named by `thumbnail`
└── ...                    any other files the plugin names
```

- `manifest.json` is required and must sit at the archive root. A ZIP made by
  zipping a folder puts it one level down and is rejected with
  `manifest-missing`; zip the folder's contents instead.
- Paths in the manifest are archive-relative and must resolve inside the
  archive. An entry that escapes the archive is rejected as `unsafe-path`.
- Every file the manifest names must exist in the archive:
  `entry-not-in-archive`, `vertex-not-in-archive`, `thumbnail-not-in-archive`.

## 2. `manifest.json`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable, URL-safe; the Dexie primary key. `id-invalid` when empty or not URL-safe. |
| `name` | string | yes | Display name. `name-missing` when absent. |
| `version` | string | yes | Semver. `version-invalid` otherwise. |
| `kind` | `PluginKind` | no | Defaults to `visualizer`. `kind-invalid` for an unknown value. |
| `runtime` | `VisualizerRuntime` | executable only | `runtime-unknown` / `runtime-unsupported`. |
| `entry` | string | executable only | Archive-relative path of the file to execute. `entry-missing` when a runtime is named without one. |
| `vertex` | string | no | Optional vertex shader for `webgl-shader`. `vertex-unused` when set on another runtime. |
| `thumbnail` | string | no | Archive-relative preview image. |
| `author`, `description`, `homepage`, `license` | string | no | Shown in the manager. |
| `provider` | `PluginProviderDescriptor` | declarative only | `provider-missing` when a declarative kind has none. |
| `settings` | `PluginSettingDescriptor[]` | no | User-editable values, validated under `settings-invalid`. |

`kind` decides which fields matter. A `visualizer` needs `runtime` and `entry`
and must not carry a `provider`; a `lyrics` or `source` plugin needs a
`provider` and must not carry `runtime` or `entry`. `entry-extension-mismatch`
fires when the entry file's extension does not match the runtime.

Unknown fields are ignored rather than rejected, so a manifest written for a
newer app still installs on an older one.

## 3. Settings descriptors

Each entry in `settings` becomes one control in the plugin's settings panel.
`key` and `label` are required; `description` is optional.

| `type` | Extra fields | Control |
|--------|--------------|---------|
| `number` | `default`, `min?`, `max?`, `step?` | numeric input |
| `boolean` | `default` | switch |
| `select` | `default`, `options: {value,label}[]` | select |
| `color` | `default` | color input |
| `string` | `default`, `maxLength?` | text input |

Values are stored per plugin through the `VisualizerPluginStore` port and
survive an app restart. `resetSettings` restores every default.

## 4. Validation

`validatePluginManifest(manifest, archiveFiles)` returns
`{ valid, issues, manifest }`. Every issue carries `code`, `severity`
(`error` | `warning`), an optional `field` and a `message`. The manager refuses
an install when any issue is an error, and the dialog lists them, so a rejected
ZIP explains exactly which field or file failed.

| Code | Meaning |
|------|---------|
| `manifest-missing` | The archive has no `manifest.json` at its root. Raised by the manager, not the validator. |
| `manifest-invalid-json` | The file is not valid JSON. |
| `manifest-not-object` | The parsed value is not an object. |
| `id-invalid` | `id` is missing, empty or not URL-safe. |
| `name-missing` | `name` is missing or empty. |
| `version-invalid` | `version` is not semver. |
| `kind-invalid` | `kind` is not a known `PluginKind`. |
| `runtime-unknown` | `runtime` is not a known runtime id. |
| `runtime-unsupported` | The runtime exists but this build cannot mount it. |
| `entry-missing` | An executable plugin names no `entry`. |
| `entry-not-in-archive` | `entry` is not a file in the archive. |
| `entry-extension-mismatch` | The entry extension does not match the runtime. |
| `vertex-not-in-archive` | `vertex` is not a file in the archive. |
| `vertex-unused` | `vertex` is set on a runtime that does not use it. |
| `thumbnail-not-in-archive` | `thumbnail` is not a file in the archive. |
| `provider-missing` | A declarative kind carries no `provider`. |
| `provider-invalid` | The provider descriptor failed validation. `field` names the part. |
| `settings-invalid` | A settings descriptor failed validation. `field` names the entry. |
| `archive-invalid` | The ZIP could not be read; the message carries the `PackageArchiveError` code. Raised by the manager. |
| `already-installed` | The id is installed and `replace` was not set. Raised by the manager. |

## 5. Archive limits

`DEFAULT_ZIP_LIMITS` in `src/lib/packages/zip/readZipArchive.ts`:

| Limit | Value |
|-------|-------|
| `maxEntries` | 512 |
| `maxEntryBytes` | 8 MiB |
| `maxTotalBytes` | 32 MiB |

`readZipArchive` throws `PackageArchiveError` with a code
(`empty-archive`, `invalid-archive`, `too-many-entries`, `entry-too-large`,
`archive-too-large`, `unsafe-path`, `duplicate-path`) before anything is stored.

## 6. Install, remove and boot

1. `inspectZip` reads the archive, validates the manifest and returns the
   issues without storing anything. The dialog uses it for a dry run.
2. `installFromZip` repeats the read and validation, then writes the plugin and
   its files through the store. `replace: true` overwrites an existing id.
3. Installing or removing calls the refresh for that kind, so the registry
   tracks the installed set immediately.
4. `initializePlugins()` runs at boot: it registers the lyrics provider
   registry and its built-ins synchronously, then seeds the bundled examples,
   then reconciles every plugin registry with the installed set. Each later step
   is isolated, so a failure in one leaves the others as they were.
