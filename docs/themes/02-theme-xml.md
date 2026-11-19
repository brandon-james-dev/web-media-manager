# 02 · theme.xml specification

`theme.xml` declares **what things look like**: tokens (colors, lengths, fonts, images,
brushes, shadows), the palette that maps app semantic slots to tokens, and named styles for
buttons, panels and text. It contains no structure. Layout files reference it.

## Root

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Theme xmlns="urn:wmm:theme:1" spec="1.0">
  <Colors>…</Colors>
  <Palettes>…</Palettes>
  <Metrics>…</Metrics>
  <Fonts>…</Fonts>
  <TextStyles>…</TextStyles>
  <Images>…</Images>
  <Brushes>…</Brushes>
  <Shadows>…</Shadows>
  <ButtonStyles>…</ButtonStyles>
  <SliderStyles>…</SliderStyles>
  <PanelStyles>…</PanelStyles>
  <Defaults />
</Theme>
```

- `spec` must equal the manifest's `spec` (`E3010` if not).
- Each section is optional, may appear at most once, and must appear in the order above.
  Fixed order keeps diffs stable and lets the XSD use `xs:sequence`. `Palettes` is required.
- Every `id` is unique **within its reference kind** (a color and a brush may both be `blue`).

## Reference syntax

A reference is `@kind/id`. The kind names the declaration section, so the validator knows the
expected type statically.

| Prefix | Resolves to | Declared in |
|--------|-------------|-------------|
| `@color/` | Color | `<Colors>` |
| `@slot/` | Color (scheme-dependent, user-accent aware) | `<Palettes>` (fixed slot names) |
| `@length/` | Length | `<Metrics>` |
| `@font/` | Font family | `<Fonts>` |
| `@text/` | Text style | `<TextStyles>` |
| `@image/` | Image | `<Images>` |
| `@brush/` | Brush | `<Brushes>` |
| `@shadow/` | Shadow | `<Shadows>` |
| `@button/` | Button style | `<ButtonStyles>` |
| `@slider/` | Slider style (seek and volume) | `<SliderStyles>` (see [pages/playback.md](pages/playback.md#slider-styles-new-style-kind-amendment-to-02)) |
| `@panel/` | Panel style | `<PanelStyles>` |
| `@icon/` | Host icon (vector, tinted by `foreground`) | Not declared: a closed, host-owned list (see [03 · Icons](03-layouts.md#icons)) |

References are order-independent. A text style may reference a shadow declared further down,
and layouts reference `theme.xml` freely. Styles should prefer `@slot/` over `@color/` for anything that should follow light/dark or
the user's accent. Values starting with `{` are reserved for future bindings and are an error
in v1 (`E4020`).

## Value types

| Type | Grammar | Examples |
|------|---------|----------|
| Color | `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `transparent`, `@color/…`, `@slot/…` | `#1c3f94`, `#ffffff80` |
| Length | non-negative integer CSS pixels, or `@length/…` | `8` |
| Thickness | 1, 2 or 4 Lengths separated by spaces (all · vertical horizontal · top right bottom left) | `4`, `4 8`, `2 4 2 4` |
| CornerRadius | 1 or 4 Lengths (all · top-left top-right bottom-right bottom-left) | `6`, `6 6 0 0` |
| Brush | Color, or `@brush/…` | `@brush/chrome-gloss` |
| Number | decimal in a stated range | `0.85` |
| Boolean | `true` / `false` | |
| Enum | lowerCamelCase keyword from a closed list | `uppercase` |

There are no CSS units, `calc`, percentages (except Grid tracks, see 03), or free text. That
rules out CSS injection at the grammar level.

## Colors

```xml
<Colors>
  <Color id="navy-900" value="#0b1a3a" />
  <Color id="chrome-hi" value="#9ec3ff" />
</Colors>
```

Colors may reference other colors (`value="@color/navy-900"`). Cycles are an error (`E4011`).

## Palettes

A palette maps the **app's semantic color slots** to colors. The app's own UI (dialogs,
menus, Settings, toasts) and every widget read these slots, so a palette alone re-colors the
entire app. One palette is required per scheme listed in `manifest.colorSchemes`.

```xml
<Palettes>
  <Palette scheme="dark">
    <Set slot="background" value="@color/navy-900" />
    <Set slot="foreground" value="#e8eefc" />
    <Set slot="accent" value="#3d8bff" />
    <Set slot="border" value="#2a4a8a" />
  </Palette>
</Palettes>
```

Slots, a closed list per major version (lowerCamelCase):

| Slot | Required | Derived default when omitted |
|------|----------|------------------------------|
| `background` | yes | n/a |
| `foreground` | yes | n/a |
| `accent` | yes | n/a |
| `border` | yes | n/a |
| `card`, `popover` | no | `background` mixed 4% toward `foreground` |
| `cardForeground`, `popoverForeground` | no | `foreground` |
| `primary` | no | `accent` |
| `primaryForeground`, `accentForeground` | no | black or white, whichever contrasts more with its base |
| `secondary`, `muted` | no | `background` mixed 8% toward `foreground` |
| `secondaryForeground` | no | `foreground` |
| `mutedForeground` | no | `foreground` at 65% alpha |
| `destructive` | no | `#dc2626` |
| `input` | no | `border` |
| `ring` | no | `accent` |
| `selection` | no | `accent` at 25% alpha |
| `selectionForeground` | no | `foreground` |
| `progressTrack` | no | `muted` |
| `progressFill` | no | `accent` |

The derivation rules are **frozen for the life of major version 1**. Changing them would
change how existing themes look. New slots added in a minor version must come with a
derivation, so older themes keep working.

If `honorsUserAccent="true"`, the user's accent replaces `accent`, and every slot derived from
it is re-derived. Explicitly set derived slots (e.g. `ring`) are kept.

## Metrics

```xml
<Metrics>
  <Length id="gap-sm" value="4" />
  <Length id="gap-md" value="8" />
  <Length id="radius" value="6" />
</Metrics>
```

## Fonts

```xml
<Fonts>
  <FontFamily id="ui" fallback="sansSerif">
    <Face src="assets/fonts/ui-regular.woff2" weight="400" style="normal" />
    <Face src="assets/fonts/ui-bold.woff2" weight="700" style="normal" />
  </FontFamily>
  <FontFamily id="mono" fallback="monospace" />
</Fonts>
```

- `fallback` (required): `sansSerif` | `serif` | `monospace` | `systemUi`.
- A family with no `Face` uses only the generic fallback. Named system fonts are not allowed:
  they are unportable and a fingerprinting vector.
- `weight`: 100–900 in steps of 100. `style`: `normal` | `italic`.
- Caps: 8 families and 16 faces per theme, 2 MB per font file.

## Text styles

```xml
<TextStyles>
  <TextStyle id="body" font="@font/ui" size="13" weight="400" color="@slot/foreground" />
  <TextStyle id="caption" basedOn="@text/body" size="11" color="@slot/mutedForeground" />
  <TextStyle id="title" basedOn="@text/body" size="16" weight="700" transform="uppercase" letterSpacing="1" />
</TextStyles>
```

| Attribute | Type |
|-----------|------|
| `basedOn` | `@text/…`. Single inheritance, acyclic, depth ≤ 8. |
| `font` | `@font/…` |
| `size` | Length, 8–96 |
| `weight` | 100–900 |
| `italic` | Boolean |
| `color` | Color |
| `lineHeight` | Number 0.8–3.0 (multiplier) |
| `letterSpacing` | integer −4 … 16 (px) |
| `transform` | `none` · `uppercase` · `lowercase` · `capitalize` |
| `align` | `start` · `center` · `end` |
| `overflow` | `truncate` · `wrap` (default `truncate`) |
| `maxLines` | integer 1–10, only with `overflow="wrap"` |
| `shadow` | `@shadow/…` (text shadow uses x, y, blur and color only) |

`start`/`end` (not left/right) keep themes correct in right-to-left languages.

## Images

```xml
<Images>
  <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12">
    <Variant scale="2" src="assets/images/frame@2x.png" />
  </Image>
  <Image id="icon-play" src="assets/images/play.svg" />
</Images>
```

- `slice` (optional): nine-slice insets in **1× image pixels** (top right bottom left). Required
  when the image is used with `fit="nineSlice"`.
- `Variant scale="2|3"`: a high-DPI alternative. Its dimensions must be exactly scale × the base
  image (`E5021`).
- Formats and limits are in [05](05-validation.md#limits).

## Brushes

```xml
<Brushes>
  <SolidBrush id="panel" color="@slot/card" />
  <LinearGradient id="chrome-gloss" angle="180">
    <Stop offset="0" color="#5f8fe0" />
    <Stop offset="0.5" color="#2f5fb8" />
    <Stop offset="1" color="#1c3f94" />
  </LinearGradient>
  <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
</Brushes>
```

- `LinearGradient`: `angle` 0–359 (CSS convention), 2–8 `Stop`s, offsets 0–1 non-decreasing.
- `ImageBrush fit`: `stretch` · `cover` · `contain` · `tile` · `nineSlice`. Optional `tint` (Color)
  is applied as a multiply blend.
- Radial gradients are reserved for a later minor version.

## Shadows

```xml
<Shadows>
  <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
</Shadows>
```

`x`, `y`: −32…32. `blur`: 0–64. `spread`: −16…16. `inset`: Boolean. A `<Shadow>` may contain up
to 3 `<Layer>` children with the same attributes, for stacked shadows.

## Button styles

```xml
<ButtonStyles>
  <ButtonStyle id="transport" background="@brush/chrome-gloss" foreground="#ffffff"
               border="#0d2766" borderWidth="1" cornerRadius="16" padding="6"
               minWidth="32" minHeight="32" iconSize="16" textStyle="@text/body">
    <State name="hover" background="@brush/chrome-gloss-hi" />
    <State name="pressed" background="@brush/chrome-gloss-down" shadow="@shadow/inset" />
    <State name="disabled" opacity="0.4" />
  </ButtonStyle>

  <ButtonStyle id="play-orb" image="@image/play-orb" minWidth="48" minHeight="48">
    <State name="hover" image="@image/play-orb-hover" />
    <State name="pressed" image="@image/play-orb-down" />
  </ButtonStyle>
</ButtonStyles>
```

Properties: `basedOn` (`@button/…`), `background` (Brush), `foreground` (Color; also tints
icons), `border` (Color), `borderWidth` (Thickness), `cornerRadius`, `padding` (Thickness),
`minWidth`, `minHeight` (Length), `iconSize` (12–64), `textStyle` (`@text/…`), `shadow`,
`opacity` (0.2–1), `image` (`@image/…`; when set, the image is the whole face, drawn at its
natural size with `background`, `border` and `borderWidth` ignored, while `foreground` still
colors the icon), `iconVisible`, `iconFill`, `labelVisible` (Boolean). `iconFill` fills the icon glyph with the
foreground colour instead of drawing its outline, which is how a solid play or pause triangle is
drawn.

**States:** `hover` · `pressed` · `focused` · `disabled` · `selected` · `active`. A `<State>` may
override any property except `basedOn`, `minWidth` and `minHeight`. These are **static
appearances**, not transitions. The host applies them instantly. Exactly one state applies at a
time, by precedence: `disabled` > `pressed` > `active` > `selected` > `hover` > `focused` > base.
Combined states (e.g. active + hover) are reserved for visual state groups in a later version.

`<State name="active" value="...">` matches one value of a multi-valued command state (e.g.
`toggleRepeat`: `all`, `one`) and beats an unvalued `active` state. Value domains are defined per
command in the page specifications (see [pages/playback.md](pages/playback.md#2-host-driven-states-amendment-to-02)).
On `tablet`, `mobile` and `tv` the host never applies `hover`.

Two states are **host-driven**, so a v1 theme can reflect app state without bindings:

- `selected` applies to a button whose `commandParameter` names the current target, e.g. a
  `wmm.ui.navigate` button for the visible page.
- `active` applies while the command's toggle condition holds. The widget/command registry
  defines the condition per command, e.g. `wmm.playback.playpause` is active while audio is
  playing. That is how an image-skinned play button shows its pause face.

**Accessibility floor:** if the `focused` state changes neither `border` nor `shadow`, the
host draws its standard focus ring using `@slot/ring`. Themes cannot remove visible focus.

## Panel styles

```xml
<PanelStyles>
  <PanelStyle id="chrome" background="@brush/frame" padding="12" />
  <PanelStyle id="inset" background="@slot/card" border="@slot/border" borderWidth="1" cornerRadius="4" padding="4" />
</PanelStyles>
```

Properties: `basedOn`, `background`, `border`, `borderWidth`, `cornerRadius`, `padding`,
`shadow`, `clip` (Boolean, default `true` when `cornerRadius` > 0), `textStyle` (the default
text style for descendants that don't set one).

## Defaults

```xml
<Defaults button="@button/standard" panel="@panel/plain" text="@text/body" />
```

These styles apply when an element doesn't name one. If absent, the host's built-in styles
apply. They are derived from the palette, so a palette-only theme still looks coherent.

## Validation codes

| Code | Severity | Rule |
|------|----------|------|
| `E4011` | error | A color whose `value` chain of `@color/` references loops back to itself |
| `E4012` | error | A section out of the order in [Root](#root), or a section that appears twice |
| `E6010` | error | A reference whose `@kind/id` is not declared, in `theme.xml` or a layout. `@icon/` names a host icon instead. |
| `E6011` | error | Two declarations with the same `id` in one reference kind |
| `E6013` | error | A `basedOn` cycle, or a `basedOn` chain deeper than 8 |
| `E6014` | error | A palette missing a required slot, or two palettes for the same `scheme` |
| `E6015` | error | A `<State>` name the style kind does not support, or a `<State>` overriding `basedOn`, `minWidth` or `minHeight` |
| `E6016` | error | `maxLines` without `overflow="wrap"`, `thumb="image"` without `thumbImage`, decreasing gradient `Stop` offsets, or more than 8 font families or 16 faces |
