# 00 · Principles and scope

## Goals

1. **Total visual control within a closed vocabulary.** A theme author can rebuild the app's
   look and arrangement without touching source code, so a theme can resemble anything from a
   skinned single-window player to a dense library manager.
2. **Safety by construction.** Nothing in a package is ever executed or interpreted as code.
   The host turns typed values into styles and components itself; nothing the author writes is
   passed through to the DOM, CSS or JavaScript.
3. **Long-term compatibility.** A theme written against spec 1.0 renders on every app release
   that supports major version 1, and it can be migrated automatically when major version 2
   ships.
4. **Validation before rendering.** Every problem is found at install time, or in the author's
   editor, with a stable code, a file, a line and a fix hint. Runtime surprises are a host bug,
   not a theme bug.
5. **One source of truth.** The grammar is defined once, as a machine-readable component model.
   The XSD, TypeScript types, validator tables and reference docs are all generated from it.
   This follows the pattern `resources.ts` already uses.

## Non-goals (v1)

- Running any author code: JavaScript, WASM, CSS expressions, SVG script, or HTML.
- Raw CSS, class names, Tailwind utilities, or inline style strings.
- Naming arbitrary React components or DOM elements.
- Shipping text strings for app concepts. All text comes from i18n resource keys.
- Data bindings, event triggers, animations, templates, visual state transitions.
- Network access. Every asset comes from inside the package. Remote URLs are invalid.

## Safety model

| Threat | Mitigation |
|--------|------------|
| Script execution | No scripting grammar. SVGs are sanitized at install and only rendered as `<img>` sources (blob URLs), which browsers never script. |
| CSS injection or exfiltration | Authors never write CSS. The host serializes typed values (hex colors, integers, enum keywords) into custom properties. No author string ever reaches a `url()`. |
| XML attacks (XXE, entity expansion) | A `DOCTYPE` is rejected, external entities are impossible, and depth, size and node counts are capped. |
| ZIP attacks (path traversal, zip bombs) | Same reader rules as visualizer plugins: normalized relative paths only, no `..` or absolute paths, per-file and total uncompressed caps, compression-ratio cap, an extension allowlist. |
| Lock-out (a theme hides Settings) | Settings and theme reset are host chrome, outside theme control. There is a safe-mode URL flag and a keyboard shortcut, and a theme being tried reverts automatically unless confirmed. |
| Abusing commands | Only commands flagged theme-invokable can be referenced. Destructive commands such as removing a source or clearing the database are never flagged. |
| Resource exhaustion | Caps on images (dimensions and bytes), fonts per theme, elements per layout and nesting depth. Large images are decoded at install, not at render time. |
| Spoofing | A theme cannot render arbitrary text that looks like system UI: literal text is capped in length and flagged for review (see [03 · Text](03-layouts.md#text)). |

## Glossary

- **Package**: the ZIP file a user installs.
- **Host**: the application code that validates, compiles and renders themes.
- **Token**: a named design value (a color, font, image, length) declared in `theme.xml`.
- **Palette**: the mapping from app semantic color slots to tokens, per color scheme.
- **Style**: a named, typed bundle of appearance properties for one element type.
- **Layout**: the element tree for one form factor.
- **Primitive**: a layout container (`Panel`, `Stack`, `DockPanel`, `Grid`).
- **Control**: a leaf element with no app data (`Button`, `Text`, `Image`).
- **Widget**: an app-implemented, data-driven component with a fixed contract (`TrackList`, ...).
- **Theme IR**: the normalized, validated, version-tagged JSON model that the renderer consumes.
- **Form factor**: one of `desktop`, `tablet`, `mobile`, `tv`, resolved from viewport size and pointer type.
