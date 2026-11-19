# 05 · Validation model

## Principles

1. **One validator.** The host install path, the SDK CLI, the SDK dev server and the app's CI
   conformance suite all run the same framework-free core validator, so results never
   differ by tool.
2. **Fail closed.** Any error blocks install. Warnings install, and the user sees them. Info is
   only shown in tools.
3. **Report everything.** Within a stage, the validator collects every issue instead of
   stopping at the first, so authors fix a batch per iteration. Later stages run only if the
   previous stage had no errors, because otherwise they would report noise.
4. **Stable codes.** Issue codes are part of the public SDK contract. A code is never reused
   for a different meaning, and message text may improve without a code change.

## Pipeline

| Stage | Range | Checks |
|-------|-------|--------|
| 1. Archive | `1xxx` | ZIP readable, path normalization, traversal, allowed files and extensions, size and count limits, compression ratio, duplicate paths (case-insensitive collisions too, so packages behave the same on every OS) |
| 2. Manifest | `2xxx` | JSON parse, JSON Schema, `kind`, `spec` support, `id` format, reserved fields, `formFactors` ↔ files, `colorSchemes` ↔ palettes |
| 3. XML well-formedness | `3xxx` | UTF-8, no `DOCTYPE`, no processing instructions other than the XML declaration, no entities beyond the five predefined, depth / node / attribute-length caps, correct namespace and root element, `spec` matches the manifest |
| 4. Grammar | `4xxx` | Generated from the component model: allowed elements and attributes, required attributes, value types, enums, ranges, section order, reserved names and syntax (`{…}`, `on*` attributes, reserved elements) |
| 5. Assets | `5xxx` | Referenced files exist. Images decode (magic bytes plus a real decode in a worker), dimension caps, `@2x` dimension rules, nine-slice insets inside the image. Fonts parse (sfnt/WOFF headers). SVG sanitization. Unreferenced assets get a warning (`W5041`), as do raster images without an `@2x` variant (`W5040`). |
| 6. Semantic | `6xxx` | Reference resolution per kind, `basedOn` cycles and depth, parent-specific attributes, Grid bounds, page ids and the single `PageHost`, widget options and cardinality, commands against the theme-invokable list, resource keys exist and are `text` kind, required palette slots |
| 7. Advisory | `7xxx` | Contrast (WCAG AA 4.5:1 for text styles against the brush they sit on, when determinable, plus required slot pairs like `foreground`/`background`), touch-target sizes per form factor, layouts that overflow their form factor's minimum viewport, literal text, deprecated features |

### Archive and manifest codes

| Code | Stage | Meaning |
|------|-------|---------|
| `E1001` | Archive | The file is empty or is not a readable ZIP. |
| `E1002` | Archive | A size, count or compression-ratio limit is exceeded (see [Limits](#limits)). |
| `W1003` | Archive | Unknown file. It is not stored. |
| `E1004` | Archive | A file under `assets/` or `previews/` has a disallowed extension. |
| `E1005` | Archive | An absolute path, or a path containing `..` or an empty segment. |
| `E1006` | Archive | Duplicate path, including paths that differ only by letter case. |
| `E1007` | Archive | The path is longer than 200 characters or deeper than 6 levels. |
| `E1008` | Archive | `manifest.json` or `theme.xml` is missing. |
| `E2001` | Manifest | `manifest.json` is not UTF-8 JSON, or is not a JSON object. |
| `I2001` | Manifest | Unknown field, ignored. Fields starting with `x-` never report. |
| `E2002` | Manifest | Reserved field used. |
| `E2003` | Manifest | `id` uses the reserved `wmm-` prefix. |
| `E2004` | Manifest | A required field is missing, or a field has the wrong JSON type. |
| `E2005` | Manifest | A field value breaks its rule in [01](01-package-and-manifest.md#2-manifestjson-specification). |
| `E2006` | Manifest | A listed form factor has no layout file. |
| `W2006` | Manifest | A layout file exists for a form factor that is not listed. It is not used. |
| `W2008` | Manifest | The running app is older than `app.min`. Install is allowed. |
| `E2010` | Manifest | `spec` needs a newer minor than the host supports. |
| `E2011` | Manifest | `spec` has a different major than the host supports. |

The `colorSchemes` ↔ palettes check needs the parsed `theme.xml`, so it runs in stage 6.

## Issue shape

```json
{
  "code": "E6050",
  "severity": "error",
  "file": "layouts/desktop.xml",
  "line": 42,
  "column": 9,
  "path": "/Layout/Shell/DockPanel/Stack[2]/Button[3]/@command",
  "message": "Command \"wmm.sync.sync\" cannot be used by themes.",
  "hint": "Theme buttons can invoke: wmm.playback.playpause, wmm.playback.next, …",
  "specRef": "03-layouts.md#button"
}
```

Code prefixes: `E` error, `W` warning, `I` info. The digits after the letter are the stage
range. Codes appearing in this spec are normative. The full table is generated from the
component model into the SDK reference.

## Limits

| Limit | Value |
|-------|-------|
| ZIP size (compressed) | 50 MB |
| Total uncompressed | 100 MB |
| Files | 2,000 |
| Single file | 20 MB (images), 2 MB (fonts), 1 MB (XML), 64 KB (manifest) |
| Compression ratio per file | ≤ 100:1 |
| Path length | 200 chars, max depth 6 |
| XML element depth | 64 |
| Elements per layout file | 5,000 |
| Attribute value length | 1,024 chars |
| Declarations per section in `theme.xml` | 1,000 |
| Image dimensions | ≤ 8192 × 8192 and ≤ 32 megapixels |
| Fonts | 8 families, 16 faces |
| `basedOn` depth | 8 |
| Pages per layout | 12 |
| Literal text | 32 chars |

Limits may be raised in a minor version, never lowered within a major.

## Asset rules

- **Images:** PNG, JPEG, WebP, GIF (only the first frame renders, since animation is reserved),
  SVG. The extension must match the magic bytes (`E5002`).
- **SVG sanitization (allowlist):** shapes, paths, gradients, `use` with internal fragment
  references only, text, groups, `viewBox`. Rejected: `script`, `foreignObject`, event
  attributes, `href`/`xlink:href` to anything but `#fragment`, `style` elements containing
  `@import` or `url(` with non-fragment targets, external entities, animation elements (`animate*`,
  `set`). Sanitized SVG is stored. A sanitized SVG differing from the original produces `W5030`,
  so authors know something was stripped.
- **Fonts:** WOFF2, WOFF, TTF, OTF. Loaded via the FontFace API from a Blob URL, never by
  injecting `@font-face` text built from author strings.

## Runtime guarantees the validator enables

The renderer receives only a validated IR, so it may assume every reference resolves, every
value is in range, and every widget option is known. Defensive checks in the renderer are
limited to **host invariants** (e.g. a widget throwing). They never repeat validation. When
the IR is loaded from cache, it is re-validated only if the host's validator version
changed (see [07](07-installation-runtime-sdk.md#compiled-cache)).

## Re-validation on app upgrade

App contracts (resource keys, theme-invokable commands, icons, widget options) are checked
against the **running** app version. After an app update, the host re-runs stage 6 against
stored packages in the background:

- New errors are rare, since contracts only grow within a major (see [06](06-versioning-and-upgrades.md)).
  If one occurs, it is a host regression. The host falls back to the built-in theme and shows
  the issue list in Settings, rather than rendering a partial theme.
- Deprecation warnings are recorded and shown in the theme's details.
