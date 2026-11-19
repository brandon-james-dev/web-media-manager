# 01 · Package structure and manifest.json

## 1. Package structure

```
classic-blue.wmmtheme.zip
│
├── manifest.json            required  Identity, versions, compatibility, entry points
├── theme.xml                required  Tokens and styles
├── layouts/
│   ├── desktop.xml          optional  Falls back to the host's built-in desktop layout
│   ├── tablet.xml           optional  Falls back to the host's built-in tablet layout
│   ├── mobile.xml           optional  Falls back to the host's built-in mobile layout
│   └── tv.xml               optional  Falls back to the host's built-in TV layout
├── assets/
│   ├── images/              optional  png, jpg/jpeg, webp, gif (static first frame only), svg (sanitized)
│   └── fonts/               optional  woff2, woff, ttf, otf
├── previews/                optional  Gallery screenshots shown before install (png/jpg/webp)
├── LICENSE                  optional  Plain text, shown in the theme details
└── README.md                optional  Plain text, shown as text (never rendered as HTML)
```

Rules:

- The ZIP root is the package root. A single top-level folder wrapping everything is
  accepted and stripped (common when zipping a folder). Any other nesting is an error.
- Paths are case-sensitive, use `/`, and are matched exactly. Authors should use lowercase
  kebab-case (see [04](04-conventions-and-schema.md)).
- Only the files and folders listed above are allowed. Unknown root files are a warning
  (`W1003`) and are not stored. Unknown files under `assets/` with disallowed extensions are an
  error (`E1004`).
- Entry point paths are fixed in v1. `manifest.json` does not remap them, which keeps tooling
  and authors' expectations simple. The fields are reserved so a later minor version can allow
  overrides.
- The recommended file extension is `.wmmtheme.zip`. The host accepts any `.zip`.

## 2. manifest.json specification

JSON (not XML) on purpose. It is the same envelope the visualizer plugin pipeline already reads
(`kind` distinguishes them), so install, list and remove share one code path. It is also readable
without an XML parser for gallery listings.

```json
{
  "$schema": "https://schemas.wmm.invalid/theme/1/manifest.schema.json",
  "kind": "theme",
  "spec": "1.0",
  "id": "classic-blue",
  "name": "Classic Blue",
  "version": "1.2.0",
  "description": "A glossy blue desktop player look from the early 2000s.",
  "author": { "name": "Jane Doe", "url": "https://example.com" },
  "license": "MIT",
  "homepage": "https://example.com/classic-blue",
  "app": { "min": "0.9.0" },
  "formFactors": ["desktop", "tablet", "mobile"],
  "colorSchemes": ["dark"],
  "honorsUserAccent": false,
  "previews": ["previews/desktop.png", "previews/mobile.png"],
  "thumbnail": "previews/thumb.png",
  "tags": ["retro", "glossy", "blue"]
}
```

| Field | Type | Req. | Rules |
|-------|------|------|-------|
| `$schema` | string | no | Ignored by the host. Lets editors offer JSON completion. |
| `kind` | `"theme"` | yes | Must be exactly `theme`. |
| `spec` | `"MAJOR.MINOR"` | yes | The **minimum** spec version the theme needs. The host installs it if `MAJOR` is supported and `MINOR` ≤ the host's supported minor (see [06](06-versioning-and-upgrades.md)). |
| `id` | string | yes | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, 3–64 chars. Globally unique, stable forever, also the storage key. `wmm-` prefix is reserved for built-in themes. |
| `name` | string | yes | 1–64 chars, plain text, shown in Settings. Not translated in v1. |
| `version` | SemVer 2.0 | yes | Theme version. Upgrades require a higher version for the same `id`. |
| `description` | string | no | ≤ 280 chars, plain text. |
| `author` | object | no | `name` ≤ 64 chars. `url` must be `https:` and is shown as text with a confirm-to-open link. |
| `license` | string | no | SPDX identifier or `"SEE LICENSE IN LICENSE"`. |
| `homepage` | string | no | `https:` URL. |
| `app.min` | SemVer | no | Minimum app version, for theme-relevant fixes outside the spec (e.g. a widget bug). Advisory: below it, installing warns but is allowed. |
| `formFactors` | string[] | yes | Subset of `desktop`, `tablet`, `mobile`, `tv`, without duplicates. May be empty. Each listed value requires its layout file, and a present layout file not listed here is a warning. A form factor that is not listed shows the host's built-in layout with the theme's tokens and styles. |
| `colorSchemes` | string[] | yes | Non-empty subset of `light`, `dark`. Each needs a `<Palette scheme>` in `theme.xml`. A single scheme disables the app's light/dark toggle while the theme is active. |
| `honorsUserAccent` | boolean | no | Default `false`. If `true`, the user's accent picker overrides the palette `accent` slot (and its derived slots). |
| `previews` | string[] | no | ≤ 6 paths under `previews/`. |
| `thumbnail` | string | no | Path under `previews/`, ≤ 512×512. |
| `tags` | string[] | no | ≤ 8 lowercase kebab-case tags, ≤ 24 chars each. |

**Unknown fields:** ignored with an info issue (`I2001`). That keeps older hosts able to read
newer manifests. Fields beginning with `x-` are reserved for third-party tooling and never warn.

**Reserved fields (must not be used in 1.0, error `E2002`):** `entry`, `layouts`, `requires`,
`dependencies`, `extends`, `permissions`, `scripts`, `bindings`. Each has a planned meaning (see
[06](06-versioning-and-upgrades.md#reserved-syntax)).

**Encoding:** UTF-8 without BOM (a BOM is tolerated and stripped). Maximum 64 KB.
