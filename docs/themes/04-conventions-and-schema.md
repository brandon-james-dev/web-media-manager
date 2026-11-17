# 04 · XML naming conventions and schema strategy

## 7. Naming conventions

| Thing | Convention | Examples |
|-------|-----------|----------|
| Element names | PascalCase nouns | `ButtonStyle`, `DockPanel`, `TrackList` |
| Attribute names | lowerCamelCase | `cornerRadius`, `labelKey`, `commandParameter` |
| Enum values | lowerCamelCase keywords | `iconAndLabel`, `nowPlaying`, `nineSlice` |
| Author ids (`id`) | kebab-case `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, ≤ 48 chars | `chrome-gloss`, `play-orb` |
| Package files | lowercase kebab-case + extension | `play-orb@2x.png` |
| References | `@kind/id` | `@button/transport` |
| App contracts | their own registry format, verbatim | `wmm.playback.playpause`, `playback.playPause` |
| Collections | plural element wrapping singular items | `<Colors><Color/></Colors>` |
| Style references on elements | `style` for the element's own kind | `<Button style="@button/x">` |
| Resource key attributes | suffix `Key` | `labelKey`, `titleKey`, `altKey` |
| Booleans | positive adjective or noun, no `is`/`has` prefix | `artwork="true"`, `decorative="true"` |
| Directional values | logical (`start`/`end`), never `left`/`right` | `dock="start"` |

Additional rules:

- **No abbreviations** except universally understood ones (`id`, `min`, `max`).
- **No attribute or element is ever renamed within a major version.** Renames are breaking.
  Instead, add the new name, deprecate the old one with a warning, and remove it in the next major.
- **Attributes for scalars, child elements for collections.** A value that might later need
  structure (e.g. gradient stops) starts life as a child element.
- **Whitespace:** list-valued attributes (`columns`, `views`) are separated by single spaces.
  Leading and trailing whitespace is trimmed and runs of whitespace collapse.
- **Case-sensitive everywhere**, matching XML itself.
- Element names in the prefix sets listed under [06 · Reserved syntax](06-versioning-and-upgrades.md#reserved-syntax) are reserved.

## 8. XML schema strategy (XSD)

### One source of truth, many generated artifacts

The grammar is authored once as a **component model**: a machine-readable registry in app core
(in the style of `src/i18n/resources.ts` and `src/events/taxonomy.ts`). It describes every
element, its attributes, value types, enums, ranges, permitted parents and children,
cardinality, deprecation status, and the spec version that introduced it. Everything else
is generated from that model:

```
component model (core, versioned)
├── XSD 1.0 schemas                 → IDE completion and squiggles, third-party tooling
├── manifest JSON Schema            → editor completion for manifest.json
├── validator tables                → the host and SDK validator (one implementation)
├── TypeScript IR types             → compiler and renderer
├── reference documentation         → the element/attribute tables in this spec
└── app-contract enums (per release) → resource keys, theme-invokable commands, icons
```

CI fails if a generated artifact is out of date, the same rule `npm run i18n:sync` applies to
language packs.

### Schema files (published per major version)

| File | Target namespace | Contents |
|------|------------------|----------|
| `wmm-theme-1.xsd` | `urn:wmm:theme:1` | Root entry: includes the files below. Defines `Theme` and `Layout`. |
| `wmm-theme-1-types.xsd` | (included) | Simple types: Color, Length, Thickness, CornerRadius, reference patterns per kind, enums. |
| `wmm-theme-1-elements.xsd` | (included) | Primitives, controls, widgets, styles. |
| `wmm-contracts-<app-version>.xsd` | (included) | Generated per app release: `ResourceKey`, `ThemeCommand` and `IconName` enumerations. |
| `manifest-1.schema.json` | n/a | JSON Schema (draft 2020-12) for `manifest.json`. |

Authors associate a schema with a file in one of two ways. An editor XML catalog shipped by the
SDK maps `urn:wmm:theme:1` to the local files, which is the preferred way. Alternatively the
file uses `xsi:schemaLocation`, which the host ignores, so it is always harmless.

### Why XSD 1.0 (and what it does not do)

XSD 1.0 has the broadest editor support (VS Code XML extension, JetBrains, oXygen, xmllint).
It enforces element structure, attribute presence, simple-type patterns, enums and ranges.
`xs:key`/`xs:keyref` also give in-editor checks for references inside one file.

XSD is **advisory for authors, not authoritative for the host.** It can't express:

- cross-file references (a layout referencing `@button/x` defined in `theme.xml`);
- reference kinds against declared ids across sections, with cycle detection for `basedOn`;
- parent-dependent attributes (`dock` only under `DockPanel`);
- cardinality across pages, and widget minimum sizes;
- asset checks (file exists, image dimensions, font format);
- app-contract checks against the *installed* app version.

The host and the SDK run the same **semantic validator** generated from the component model
(see [05](05-validation.md)). The XSD and the validator are generated from the same model, so a
file the XSD accepts will at worst fail with a semantic issue. The two never disagree on
grammar.

### Schema evolution rules

- The target namespace changes **only** with a major version (`urn:wmm:theme:2`).
- Minor versions publish a new XSD in the same namespace. It must accept every document the
  previous minor accepted, so changes are additive only: new optional attributes, new elements
  in new positions, new enum values.
- New enum values in a minor version are a known XSD limitation: older editors flag them. The
  SDK always ships the latest minor's schema, and the `spec` attribute tells the host which
  rules apply.
- The contracts XSD is regenerated each app release. Removing a resource key or command from
  it is a breaking app change (see [06](06-versioning-and-upgrades.md#app-contract-stability)).
