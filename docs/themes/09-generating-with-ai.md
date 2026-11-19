# 09 · Generating a theme with an AI assistant

This page has a prompt you can paste into an AI chat or coding assistant to get a
new theme package. The spec in this folder is strict and fully typed, so a model
that reads it can produce a package that installs on the first or second try.

## Before you start

- Give the assistant the spec. A coding assistant that can open files or URLs can
  read this folder directly. For a plain chat, attach these files:
  `01-package-and-manifest.md`, `02-theme-xml.md`, `03-layouts.md`,
  `04-conventions-and-schema.md`, `05-validation.md`, `pages/playback.md`,
  `pages/songs.md`, and one complete example (`08-example-classic-blue.md`.
- Have a reference ready. Screenshots of the look you want work best. A written
  description also works.
- Know how you will test it. **Settings → Custom themes → Install theme** runs the same
  validator as every other tool and lists any issues by code. Trying a theme
  reverts on its own after 15 seconds unless you choose **Keep**, and starting the
  app with `?theme=default` ignores the active theme.

## The prompt

Replace the parts in `<angle brackets>` and paste everything between the lines.

---

```text
You are creating a theme package for Web Media Manager, a music library and
device sync app. Themes follow Web Media Manager Theme Specification 1.0
(XML namespace urn:wmm:theme:1). The spec documents are in docs/themes/ of
https://github.com/brandon-james-dev/web-media-manager (attached or linked).
Read all of them before writing anything. The spec is normative: if it does not
list an element, attribute, command, widget or resource key, it does not exist.

The look I want:
<Describe the style, or say "match the attached screenshots". Mention colors,
light or dark, the era or mood, the shape of buttons and panels, and anything
that must be on screen at all times, such as the transport bar.>

Theme details:
- id: <lowercase-kebab-case, 3-64 chars, must not start with wmm->
- name: <display name>
- author: <your name>
- license: <SPDX id, e.g. MIT>
- form factors: <desktop only, or desktop plus tablet / mobile / tv>
- color schemes: <light, dark, or both>
- honor the user's accent color: <yes / no>

Rules you must follow:
1. A theme is data, not code. No scripts, expressions, raw CSS, HTML, inline
   styles, event attributes (on*) or {...} binding syntax. Do not use any
   reserved manifest field or reserved element.
2. Produce exactly this package layout: manifest.json, theme.xml,
   layouts/desktop.xml, one layout file per extra form factor you list,
   assets/images/ for images, assets/fonts/ only if you ship fonts, and
   previews/ for the thumbnail. File and folder names are lowercase
   kebab-case.
3. All visible text comes from i18n resource keys listed in the page specs.
   Do not write literal strings in layouts.
4. Buttons may only call theme-invokable commands listed in the spec.
   Widgets may only use the attributes their spec section lists.
5. Every layout has exactly one PageHost and declares the pages the spec
   requires, with stable ids. Give every resizable or persisted element an id.
6. Put colors, fonts, text styles, brushes and button/panel styles in
   theme.xml and reference them with the @kind/name syntax. Layout files hold
   structure only.
7. Draw images as hand-written SVG (no embedded raster data, scripts, external
   references or foreignObject). Give buttons normal, hover, pressed and
   disabled looks where the spec allows it. Every asset you ship must be
   referenced somewhere.
8. Meet WCAG AA contrast (4.5:1) for text against the brush it sits on, and
   keep touch targets at the sizes the spec gives for each form factor.
9. The previews/thumbnail.png file must be a PNG no larger than 512x512.
   If you cannot produce binary files, give me the SVG source for it and tell
   me to export it as PNG.

Work in this order:
1. Summarize the design: palette slots and values, fonts, the button and panel
   styles you need, and a rough tree for each page.
2. Write manifest.json, then theme.xml, then each layout file, then the SVG
   assets. Output each file in full, with its package path as a heading.
3. Check your own output against docs/themes/05-validation.md stage by stage
   and list anything you are unsure of.
4. Tell me how to zip it: the files must sit at the ZIP root, or inside one
   top-level folder.

When I paste validator issues back to you, fix only the files they name,
explain each fix by issue code, and output the changed files in full.
```

---

## After the first attempt

1. Zip the files so `manifest.json` is at the root, and install the ZIP in
   Settings.
2. Copy the issue list (codes plus messages) back into the same chat. Errors
   block install, warnings do not.
3. Once it installs, try it on each page (Now Playing, Library, Playlists,
   Sync), resize the window, and send screenshots of anything that looks wrong.
   Models fix layout problems much faster from a screenshot than from a
   description.
4. Choose **Keep** when you are happy with it.

## Working inside this repository

If you are adding an example theme to the repository itself, use the same prompt
and point the assistant at `examples/themes/`. Then add the theme id to
`scripts/build-example-themes.mjs` and to `EXAMPLE_THEMES` in
`src/lib/themes/pipeline/exampleThemes.test.ts`, run `npm run build:themes`, and
run the test suite. The test runs the real validator on every example package.
