# 06 · Versioning and upgrade strategy

## 10. Versioning

Four version axes are kept independent so each can move without forcing the others.

| Axis | Format | Owner | Meaning |
|------|--------|-------|---------|
| Spec version | `MAJOR.MINOR` (in `manifest.spec` and the XML `spec` attribute) | WMM | The grammar and semantics a theme is written against. Minimum required. |
| XML namespace | `urn:wmm:theme:MAJOR` | WMM | Changes only with the spec major. |
| Theme version | SemVer (`manifest.version`) | Author | Identifies releases of one theme. Drives updates. |
| App contracts | App SemVer | WMM | Resource keys, commands, icons, widget registry. Checked against the installed app. |

### Spec version semantics

- **Minor (1.0 → 1.1): additive only.** New optional attributes, elements, enum values, widget
  options, icons, palette slots (with frozen derivations) and theme-invokable commands. Every
  valid 1.0 document is a valid 1.1 document **with identical rendering**.
- **Major (1.x → 2.0): may break.** Removals, renames, semantic changes. A new namespace. Shipped
  with an automatic migrator (below).
- **No patch level.** Clarifications to the prose that don't change validation or rendering
  are editorial. Anything that does is a minor.

### Host compatibility rule

A host that supports spec `M.n`:

| Theme declares | Result |
|----------------|--------|
| `M.k` with k ≤ n | Installs and renders with the `M.k` rules. Features added after `k` are unavailable because the theme didn't ask for them. |
| `M.k` with k > n | Refused (`E2010`, "This theme needs a newer version of Web Media Manager"), **unless** every newer construct is marked ignorable (below). |
| `M-1.x` (previous major) | Migrated at load time to `M` (see the upgrade strategy). |
| `M-2.x` or older | Refused, with a message naming the last app version that supported it. |
| `M+1.x` | Refused (`E2011`). |

### Forward compatibility within a major: ignorable features

Borrowed from markup-compatibility designs: a theme can use newer minor features **and** still
install on older hosts by declaring which constructs are safe to drop.

```xml
<Layout xmlns="urn:wmm:theme:1" xmlns:v1_2="urn:wmm:theme:1.2"
        spec="1.0" ignorable="v1_2" formFactor="desktop">
  <Stack>
    <v1_2:Slider command="wmm.playback.volume" />   <!-- dropped on a 1.0 host -->
    <Button command="wmm.playback.next" labelKey="playback.next"
            v1_2:transition="fade" />                <!-- attribute dropped on a 1.0 host -->
  </Stack>
</Layout>
```

- `spec` stays the true minimum (here 1.0). Features from 1.2 live in the
  `urn:wmm:theme:1.2` namespace, and the prefix is listed in `ignorable`.
- A host that understands 1.2 treats those names as normal 1.2 constructs. An older host
  removes the ignorable elements (with their subtrees) and attributes, then validates the rest.
  The result must be valid on its own, which the SDK checks with `wmm-theme validate --as 1.0`.
- `ignorable` and versioned namespaces **are part of 1.0**, even though 1.0 has nothing to
  ignore. That is what makes the mechanism work on the first generation of hosts.

## App contract stability

Themes reference app-owned registries. Their stability rules are part of this spec:

- **Resource keys, commands, icons, widget names and widget options are additive.** Removing
  or renaming one that a published theme may reference requires the app to keep an
  **alias** for the rest of the theme spec major. The validator resolves aliases and emits a
  deprecation warning (`W7010`).
- A resource key's **kind** (text vs template vs plural) never changes once published.
- Widget behavior may improve, but a widget option's meaning never changes within a major.
- The theme-invokable flag is never removed from a command within a major.

## 14. Upgrade strategy for future versions

### The IR is the compatibility boundary

```
theme 1.x XML ──► parser 1 ──► validator 1 ──► compiler 1 ──┐
                                                            ├──► Theme IR (vN) ──► renderer
theme 2.x XML ──► parser 2 ──► validator 2 ──► compiler 2 ──┘
```

The renderer only knows the current IR version. Each supported spec major has its own
front end (parser, validator, compiler) that produces that IR. Supporting an old major means
keeping its front end, not teaching the renderer old syntax. When the IR changes, the cached
compiled IR is invalidated and recompiled from the stored original package.

### Major-version migration

1. The previous major's front end stays in the host for **one full major cycle**. A 2.x host
   reads 1.x themes, and a 3.x host does not.
2. Each major ships a **declarative migrator** (`1 → 2`) used in two places: the host, at load
   time, in memory, never modifying the stored original; and the SDK command `wmm-theme upgrade`,
   which rewrites the author's source files and prints a change report.
3. Deprecations are announced at least one minor version before the major. The validator warns
   (`W7010`) with the replacement, so authors can migrate early.
4. Migrations must be lossless for every non-deprecated feature. If something can't be
   migrated, the migrator emits an issue rather than silently dropping it.

### Reserved syntax

Reserved now so that future features are additive and never reinterpret v1 content. Using any
of these in 1.0 is an error (`E4020`–`E4024`), which guarantees no v1 theme accidentally depends
on them.

| Reserved | Planned feature | Sketch of the intended design |
|----------|-----------------|-------------------------------|
| Attribute values beginning with `{` | **Bindings** | `<Text value="{bind playback.current.title}"/>`. Read-only paths from a typed **binding registry** (like resources): no expressions, only named paths plus named formatters. |
| Attributes beginning with `on` (`onClick`, …) | **Events** | No inline handlers ever. Events arrive as declarative triggers: `<EventTrigger event="wmm.playback.started">` with property setters. They reference the existing event taxonomy. |
| Elements `Binding`, `EventTrigger`, `Trigger`, `Setter` | Bindings and events | As above. |
| Elements `Storyboard`, `Animation`, `Transition`, and attribute `transition` | **Animations** | Declarative, time-bounded animations of `opacity`, transforms and brush colors only. They respect `prefers-reduced-motion` by default. |
| Elements `Template`, `ControlTemplate`, `ItemTemplate`, and attribute `template` | **Templates** | Re-skin a control's or a widget row's internal tree using primitives and bindings, with no code. |
| Elements `VisualStateGroup`, `VisualState` | **Visual state transitions** | Named state groups with combined states and transitions, superseding v1's single-state `<State>`. v1 `<State>` is migrated automatically. |
| Element `WidgetOptions`, and attribute `options` | **Custom widget configuration** | Typed, widget-declared option schemas (like visualizer plugin settings), validated from the widget registry. |
| Elements `Slider`, `ProgressBar`, `Toggle`, `Splitter`, `ScrollViewer`, `Variant` | New primitives and controls | Volume and seek sliders as controls, user-resizable panes, orientation-specific layout variants. |
| Manifest fields `entry`, `layouts`, `requires`, `dependencies`, `extends`, `permissions`, `scripts`, `bindings` | Package features | `extends`: inherit from another installed theme. `requires`: capability flags. `scripts`: reserved so it is never quietly introduced. Any scripting would need a separate, sandboxed plugin kind, never a theme. |
| Attribute `initialFocus` | TV focus control | Names the element that receives focus when a page opens on TV. |
| Element prefixes `X`, `Wmm`, `Host` | Host extensions | Never available to authors. |

### Deprecation lifecycle

`introduced (minor N)` → `deprecated (minor M, warning W7010 with replacement)` →
`removed (next major, migrated automatically)`. The component model records each stage, so
docs, schemas and validator messages all stay in sync.
