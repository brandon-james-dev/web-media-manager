# 10 · Creating a theme widget

This page is for app engineers. It explains how to add a new widget that theme
layouts can place, such as `<SleepTimer />`, and ends with a prompt you can give
an AI coding agent to do the work.

A widget has two halves, kept side by side in one folder:

| File | What it is | May import |
|------|------------|------------|
| `definition.ts` | The element's grammar: name, attributes, size and count limits. Pure data. | Only `@/core/themes/widgetKit` |
| `<Name>.tsx` | The React component that draws the widget. | Anything in the app |

The validator, the IR compiler and the SDK read `definition.ts` only. That is why
it can't import React or app code: validating a theme must never load the app.

## 1. Pick a folder

Widgets are grouped by the page family they belong to:

```
src/components/theme-widgets/
  library/<Name>/       library, playlist and sync widgets
  playback/<Name>/      transport and Now Playing widgets
  shared/               helpers used by many widgets (WidgetFrame, themeText, ThemeSlider)
```

A helper used only by one widget lives in that widget's folder. A helper several
widgets in one family share lives in that family's `shared/` folder.

## 2. Write `definition.ts`

```ts
import { ReferenceKind, ValueType, defineWidget } from "@/core/themes/widgetKit";

/**
 * Minutes left on the sleep timer, or nothing when it is off. Minimum 32×12,
 * unlimited per page.
 *
 * @example
 * ```xml
 * <SleepTimer format="minutes" text="@text/caption" />
 * ```
 * @example
 * ```ts
 * const { format } = SLEEP_TIMER_ELEMENT.attributes;
 * ```
 *
 * @see [ThemeSleepTimer](./SleepTimer.tsx)
 */
export const SLEEP_TIMER_ELEMENT = defineWidget({
  name: "SleepTimer",
  attributes: {
    format: { type: ValueType.Enum, values: ["minutes", "clock"], default: "minutes" },
    text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  minSize: { width: 32, height: 12 },
  perPage: null,
});
```

`defineWidget` fills in what every widget shares:
- the widget category;
- the common attributes (`id`, `visibleIn`, docking, size, margin, alignment) and
  the widget attributes (`panel`, `density`);
- `children: NO_CHILDREN` unless you pass another child rule;
- the spec version.

List only the widget's own attributes. Every attribute the component reads must
be declared here, or themes that use it fail validation. Rules of thumb:

| Need | Declare |
|------|---------|
| A fixed set of choices | `ValueType.Enum` with `values` (and a `default` when one applies) |
| An ordered subset of choices | `ValueType.EnumList` |
| A style slot | `ValueType.Reference` with `refKinds: [ReferenceKind.Text]`, `Button`, `Panel` or `Slider` |
| On/off | `ValueType.Boolean` |
| Visible text the theme picks | `ValueType.ResourceKey` |
| Only once per page | `perPage: 1` (or `null` for unlimited) |
| Restrict where it may appear | `parents: ["Panel", …]` |
| A size that depends on an attribute | `minSize: { bar: {…}, edge: {…} }` with `minSizeBy: "variant"` |

## 3. Write the component

```tsx
import { attrString } from "@/core/themes";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useTranslation } from "@/i18n";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";

/** …description, ```xml and ```tsx examples… */
export function ThemeSleepTimer({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const format = attrString(node, "format") ?? "minutes";
  const textClass = useThemeTextClass(node, "text");

  return (
    <WidgetFrame node={node} style={style}>
      <span className={textClass}>{t("playback.sleepTimer")}</span>
    </WidgetFrame>
  );
}
```

- **`node`** is the compiled element. Read attributes with the helpers from
  `@/core/themes`: `attrString`, `attrList`, `attrBool`, `attrRef`, `readAttr`.
  Don't read `node.attributes` directly.
- **`style`** is the layout the renderer computed (docking, size, margin). Always
  pass it to `WidgetFrame`. The frame also applies the `panel` style, the minimum
  size, and an error boundary so a crashing widget can't take the theme down.
- **Style slots** resolve with `useThemeTextClass(node, "text")` for text, or
  `useThemeRender().stylesheet.classes.<kind>[id]` with `attrRef` for buttons,
  panels and sliders. `ThemeSlider` already handles slider styles.
- **Icons** come from `THEME_ICONS` in `@/lib/themes/render/browser`.
- **App data** comes from the usual hooks (`usePlayback`, `useSongs`, `useSync`,
  …). Widgets must not reach into `@/lib/themes/*` beyond the allowed modules
  listed in section 6.
- **Text** comes from i18n keys. Never literal strings.
- **State the user changes** (widths, sort, expansion) is stored under a key made
  of the theme id, page id and element `id`, like `storedTrackSort.ts` and
  `Panel.tsx`, so two widgets of the same kind don't share it.
- Keep pure logic in plain exported functions (see `formatTime` in
  `PlaybackTime.tsx`) so it can be unit tested without React.

## 4. Register both halves

Two one-line additions:

1. `src/lib/themes/componentModel/layoutElements/index.ts`: import the definition
   and add `SleepTimer: SLEEP_TIMER_ELEMENT,` to `LAYOUT_ELEMENTS`.
2. `src/components/theme-widgets/index.ts`: import the component and add
   `SleepTimer: ThemeSleepTimer,` to `THEME_PLAYBACK_WIDGETS` or
   `THEME_LIBRARY_WIDGETS`.

Until step 2 is done, the app draws a placeholder where the widget goes.

## 5. Only if the widget needs it

| If the widget… | Also change |
|----------------|-------------|
| shows new text | `src/i18n/en-US.ts`, `src/i18n/resources.ts`, `src/i18n/locales/es-MX.csv` |
| has a rule involving other elements ("needs a `TrackList` on the page") | `src/lib/themes/validator/checkLayout.ts`, a new issue code, and its row in [05 · Validation](05-validation.md) |
| needs a command theme buttons can call | the theme-invokable flag in `src/events/taxonomy.ts`, and `render/layout/buttonState.ts` for disabled/active state |
| needs a helper from the theme engine that `@/core/themes` doesn't expose yet | add a small command to `src/core/themes/` and export it from its `index.ts` |

## 6. Document and test

- Add a row to the widget table of the page it belongs to:
  [pages/playback.md §3](pages/playback.md#3-widgets) or
  [pages/songs.md §3](pages/songs.md#3-widgets). Add the name to the widget list
  in [03 · Layouts](03-layouts.md). Theme authors (and the AI theme prompt in
  [09](09-generating-with-ai.md)) only know what these pages list.
- Use the widget in an example theme under `examples/themes/`, then run
  `npm run build:themes`.
- Run the checks:

```bash
npx tsc -b && npm test && npm run lint
```

`src/components/theme-widgets/widgetDefinitions.test.ts` fails when:
- a `definition.ts` imports anything other than `@/core/themes/widgetKit`;
- a widget folder has no `<Name>.tsx` next to its `definition.ts`;
- the widget folders and the widget entries in `LAYOUT_ELEMENTS` don't match, or
  a widget isn't registered in `theme-widgets/index.ts`;
- a component imports `@/lib/themes/*` other than `render/browser`, `runtime`,
  `runtime/browser` or `getThemeManager`.

`src/lib/themes/pipeline/exampleThemes.test.ts` runs the real validator over every
example theme, so a mismatch between the XML and the definition shows up there.

## The prompt

Replace the parts in `<angle brackets>` and paste everything between the lines
into a coding agent that has this repository open.

---

```text
Add a new theme widget to Web Media Manager (this repository).

The widget:
- name: <PascalCase element name, e.g. SleepTimer>
- family: <playback or library>
- what it shows and does: <description, including the idle/empty state>
- attributes theme authors can set: <name, type, allowed values, default>
- style slots: <e.g. text="@text/...", or none>
- minimum size: <width×height>, per page: <1 or unlimited>
- where it may be placed: <anywhere, or a page role / parent element>
- new visible text: <i18n keys and English wording, or none>

Before writing anything, read:
- docs/themes/10-creating-widgets.md (the process; follow it exactly)
- docs/themes/03-layouts.md and the page spec for the family
  (docs/themes/pages/playback.md or docs/themes/pages/songs.md)
- one existing widget folder of similar shape, e.g.
  src/components/theme-widgets/playback/PlaybackTime/
- AGENTS.md, if present

Rules:
1. Create src/components/theme-widgets/<family>/<Name>/definition.ts and
   <Name>.tsx. Nothing else goes in that folder unless only this widget uses it.
2. definition.ts uses defineWidget and imports ONLY from
   "@/core/themes/widgetKit". List only the widget's own attributes.
3. The component is named Theme<Name>, takes ElementProps, wraps its output in
   WidgetFrame with node and style, reads attributes with the helpers from
   "@/core/themes", and gets text only from i18n keys. It may import
   "@/lib/themes/render/browser" but no other "@/lib/themes/*" module.
4. Register the definition in
   src/lib/themes/componentModel/layoutElements/index.ts and the component in
   src/components/theme-widgets/index.ts (one line each).
5. New i18n keys go in src/i18n/en-US.ts, src/i18n/resources.ts and
   src/i18n/locales/es-MX.csv (informal "tú" Spanish).
6. Add the widget's row to the page spec's widget table and its name to the
   widget list in docs/themes/03-layouts.md.
7. Code style: 2-space indent, double quotes, semicolons, `import type` for
   types, no enums, no // or /* */ comments. Every export gets a JSDoc block
   with a description, an ```xml example and a ```ts or ```tsx example.
   No product or brand names of other media players.
8. Put any non-trivial logic in an exported pure function and unit test it in
   a sibling *.test.ts file.
9. Don't change unrelated files, and don't commit.

When done, run `npx tsc -b`, `npm test` and `npm run lint`, and report:
the files you created or changed, the output of each command, and an example
<Name /> snippet a theme author could paste into a layout.
```

---

## After the agent finishes

- Check the diff: two new files in one folder, two registration lines, the docs
  row, and i18n entries if any.
- Place the widget in an example theme, run `npm run build:themes`, install the
  ZIP from **Settings → Custom themes → Install theme** and look at it on each
  form factor the page supports.
