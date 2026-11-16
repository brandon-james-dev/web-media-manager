# WMM Resources & i18n

Application-owned user-facing text, and the framework that resolves it. This
is Phase 1 of the theme engine: a theme references resource keys, the active
language pack supplies the words, so every theme is translated the moment a
language pack is. This file is the design record / contract doc.

## Purpose

The registry in `src/i18n/resources.ts` is the single source of truth for
every string the application shows. Components ask for a key, never for a
literal; a language pack answers. Three consequences follow:

- A theme never ships its own strings for app concepts. It names a key.
- Adding a language translates the whole application, themes included.
- The registry is the safety boundary for theme references: an attribute such
  as `labelKey="playback.playPause"` is only valid when the name exists in the
  registry, and unknown names are rejected rather than rendered.

Resource keys sit alongside the command/event taxonomy in
`src/events/taxonomy.ts` and follow the same rules: one record, derived types,
derived runtime lists, and a type guard as the boundary.

## File layout

```text
src/i18n/
  resources.ts        registry: WMM_RESOURCES, derived types, guards, manifest
  types.ts            WmmLanguage, LanguagePack, DefaultLanguagePack, store port
  en-US.ts            English pack, the default (satisfies DefaultLanguagePack)
  locales/
    es-MX.csv         Spanish (Mexico) pack: one row per key, edited in a spreadsheet
    index.ts          CSV_LANGUAGE_SOURCES: every *.csv discovered with import.meta.glob
    csv.test.ts       fails when a shipped CSV is out of sync with the registry
  csv.ts              parseCsv / serializeCsv (RFC 4180, pure)
  csvPack.ts          loadCsvLanguagePack / createCsvLanguageRows
  format.ts           formatTemplate / extractPlaceholders
  validation.ts       issue codes, validators, reporting
  I18nService.ts      language resolution, lookup, fallbacks, listeners
  storage.ts          localStorage adapter for the language preference
  instance.ts         LANGUAGE_PACKS, CSV_PACK_ISSUES, DEFAULT_LANGUAGE, singleton
  useTranslation.ts   I18nContext + useTranslation hook
  I18nProvider.tsx    provider, keeps <html lang> in sync
  index.ts            public barrel + validateAppResources()
```

The default language is code, because it is the reference every other
language is translated from and the compiler should refuse to ship it
incomplete. Every other language is a CSV, because a translator should not
need to read TypeScript to fix a label.

## Adding a resource key

Edit `WMM_RESOURCES` in `src/i18n/resources.ts` only. The key union, the
runtime key list, the pack shape and the manifest are all derived from that
record, so there is no parallel list to update.

```ts
"playback.nowPlayingFormat": template(
  "Current track summary built from its artist and title.",
  ["artist", "title"]
),
```

- `text(description)` — a fixed string. Callers pass no arguments.
- `template(description, params)` — a string with positional placeholders
  `{0}`, `{1}`, ... `params` names each placeholder in order; its length is
  the arity every translation and every caller must honour. Names are
  lowerCamelCase and describe the value, not its position.

Then add the text to `en-US.ts`, which is a compile error until every key has
one (`satisfies DefaultLanguagePack`). Other languages are CSV: run
`npm run i18n:sync` to add the new row with an empty translation, and fill it
in. An untranslated key falls back to English and is reported as a
`missing-key` issue in dev.

## Translating with a spreadsheet

`src/i18n/locales/es-MX.csv` is a plain RFC 4180 CSV with two columns:

| Column | What it is |
|---|---|
| `key` | The resource key. Never edit it. |
| `es-MX` | The translation. This is the only column to fill in. |

The English text and the description of each key live in `en-US.ts` and
`resources.ts`; look a key up there when its meaning is not obvious.

1. Open the CSV in Excel, Numbers, LibreOffice Calc or Google Sheets.
2. Fill in the language column. Leave a cell empty if you do not have the
   translation yet: the app shows the English text until you do.
3. Keep every `{0}`, `{1}` placeholder. They may move within the sentence, but
   none may disappear or gain an index; the key's `template(...)` entry in
   `resources.ts` names each one.
4. Save as CSV UTF-8. Excel may add a byte-order mark; the parser strips it.
5. Run `npm run i18n:sync` after the registry changed, so new keys get a row
   and retired ones are dropped. The script keeps your translations.

`src/i18n/locales/csv.test.ts` fails when a shipped CSV is missing a key row,
has rows out of registry order, or has a header other than `key,<language>`,
so a forgotten sync is caught in CI.

## Adding a language

Create `src/i18n/locales/<bcp47-tag>.csv` with the header `key,<tag>`. The
quickest way is to copy an existing CSV and rename its last column, or to
create the file with just the header and run `npm run i18n:sync` to fill in
the key rows. Then fill in the column.

The language and the name shown in the picker are inferred from the file name,
so no code changes are needed: `es-MX.csv` becomes the `es-MX` pack, shown as
"Español de México". The tag must already be canonical BCP 47 (`es-MX`, not
`es-mx`); a file named after anything else is rejected with an `invalid-csv`
issue asking for the rename. The CSV is bundled at build time (`?raw`), so a
translation never needs a network request.

## Naming conventions

A key is a namespace followed by one or more lowerCamelCase segments, dot
separated. The pattern is enforced by `WMM_RESOURCE_KEY_PATTERN`.

| Namespace | What belongs in it |
|---|---|
| `app` | The application's own name and identity. |
| `common` | Verbs shared by many screens: cancel, close, remove, save. |
| `playback` | Transport controls, queue and now-playing wording. |
| `library` | The browsable collection: artists, albums, songs, sources. |
| `playlist` | Playlist editing and the playlist sidebar. |
| `sync` | Device sync: queue, devices, start and cancel. |
| `visualizer` | The visualizer host, its picker and its settings. |
| `metadata` | Track field names: title, artist, album. |
| `settings` | The settings screen and its preferences. |
| `navigation` | Destinations and chrome that move between views. |
| `search` | Search fields, online lookup and their results. |
| `source` | Music sources: adding, configuring, refreshing and removing them. |
| `notification` | Background job notifications and the notification popover. |
| `tv` | The TV (10-foot) interface. |

Counts are registered once with `plural()` and expanded into one pack key per
CLDR category the language uses; see [Plurals](#plurals).

Rules:

- Segments are lowerCamelCase (`playback.nowPlaying`, `settings.accentColor`).
- No leaf may also be a prefix of another key: `a.b` and `a.b.c` cannot both
  exist, because a nested JSON export would need `a.b` to be a string and an
  object at once.
- Keys describe meaning, not location. `playback.next` stays correct if the
  button moves; `playerBar.rightButton` does not.
- No `wmm.` prefix. That prefix is reserved for command and event names.

## Validation rules

`validateResourceRegistry` checks the registry, `validateLanguagePack` checks
one language's entries, and `validateLanguagePacks` runs both plus a check for
repeated languages. Entry lists rather than objects are the input, so a pack
parsed from JSON or XML can report a key that appears twice.

| Code | Severity | Compile-time | Runtime | Meaning |
|---|---|---|---|---|
| `invalid-key` | error | — | registry | Key breaks the namespace / lowerCamelCase pattern. |
| `duplicate-key` | error | — | registry, pack, pack list | The same key (or language) appears twice. |
| `key-collision` | error | — | registry | Two keys differ only by case, one is a dot-prefix of another, or a key equals a plural form key of another plural. |
| `missing-key` | error | `satisfies` | pack | A registered key, or a plural form the language needs, has no entry in the pack. |
| `missing-translation` | error | — | pack | The entry is not a string, or is empty / whitespace only. |
| `unexpected-key` | error | `satisfies` | pack | The entry is neither a registered key nor a plural form key. |
| `invalid-placeholder` | error | — | registry, pack | A template or plural param is not a unique identifier; a translation uses an index beyond the arity, or any placeholder in a text resource. |
| `unused-placeholder` | warning | — | pack | A template param index the translation never uses. |
| `unused-plural-form` | warning | — | pack | A plural form whose category the language never uses. |
| `invalid-csv` | error | — | CSV loader | The CSV has no `key` column, no column named after its language, or a file name that is not a canonical BCP 47 tag. |

A CSV row is data, so the loader checks every row before the pack is built:

- **Empty translation** — the row is left out of the pack, so the English
  text answers, and the row is reported as `missing-key` (error). The pack
  still loads; nothing is dropped.
- **Bad row** — a duplicate key, an unregistered key, a placeholder beyond the
  template's arity or a placeholder in a text resource is an error, and that
  key is left out of the pack. The label falls back to English instead of
  shipping broken, and the rest of the pack keeps working.
- **Bad header** — no `key` column, or no column named after the language,
  yields an empty pack and one `invalid-csv` error naming the expected header.
- **Bad file name** — a tag that is not already canonical BCP 47 (`es-mx`
  canonicalises to `es-MX`) yields an empty pack and one `invalid-csv` error
  asking for the file to be renamed.
- **Blank row** — a row with an empty key is a blank spreadsheet row and is
  skipped silently. A short row is padded with empty cells.

Loading never throws, so a broken CSV cannot stop the app from starting.

Where it runs:

- **Dev startup** — `src/main.tsx` calls
  `reportResourceIssues(validateAppResources())` before the first render, so a
  broken pack is named in the console instead of showing blanks.
  `validateAppResources` validates the default pack from its entries and
  reuses the issues the CSV loader collected, so a missing translation is
  reported exactly once.
- **Vitest** — `src/i18n/validation.test.ts` asserts the shipped packs are
  clean and exercises every issue code; `src/i18n/csv.test.ts` and
  `src/i18n/csvPack.test.ts` cover the parser, the serializer and every loader
  outcome; `src/i18n/locales/csv.test.ts` fails when a shipped CSV is out of
  sync with the registry. `assertValidResources` throws a readable report.
- **tsc** — `npx tsc -b` rejects the default pack with a missing or unknown
  key, and rejects a `t()` call whose argument tuple does not match the
  resource.

## React usage

```tsx
import { useTranslation } from "@/i18n";

function Transport() {
  const { t } = useTranslation();

  return (
    <button aria-label={t("playback.play")}>{t("playback.play")}</button>
  );
}
```

Templates take one argument tuple, matching the declared params:

```tsx
t("playback.nowPlayingFormat", [song.artist, song.title]);
```

`useTranslation()` returns `{ t, format, get, language, preference,
detectedLanguage, changeLanguage, languages }`. It subscribes through `useSyncExternalStore`, so a language
change re-renders every consumer. `I18nProvider` supplies the service and
mirrors the active language onto `<html lang>`; the context defaults to the
singleton, so components work without a provider.

Non-React code uses the singleton:

```ts
import { i18n } from "@/i18n";

i18n.t("sync.title");
i18n.resolve("library.artists"); // undefined for an unknown name
```

## Plurals

A count-driven string is registered ONCE with `plural()`, under its base key:

```ts
"library.songCount": plural("Song count in a list.", ["count"]),
```

`params[0]` is always the count and fills `{0}`; any further params follow it.
The pack supplies one entry per CLDR plural category the language uses,
suffixed with the capitalised category name:

| Language | Pack keys |
|---|---|
| `en-US` | `library.songCountOne`, `library.songCountOther` |
| `es-MX` | `library.songCountOne`, `library.songCountMany`, `library.songCountOther` |
| `ru` | `library.songCountOne`, `library.songCountFew`, `library.songCountMany`, `library.songCountOther` |

`getPluralCategories(language)` reports the categories `Intl.PluralRules`
selects for the language, and `getLanguagePackKeys(language)` lists every pack
key it needs. `npm run i18n:sync` adds the forms a language needs and drops the
ones it does not, so a new language gets its rows without a code change.

Callers pass the count first:

```tsx
t("library.songCount", [songs.length]);
t("sync.trackCount", [songs.length, formatBytes(totalBytes)]);
```

The service selects the category with a cached `Intl.PluralRules` for the
active language, then looks up `${base}${Category}`, then the active `Other`
form, then the default pack's form for the same count, then the default
`Other` form, then the key itself.

Rules:

- Put the verb, pronoun and noun inside every form. A form is a whole
  sentence, never a fragment a caller glues together.
- A form may leave out a placeholder it does not need, but it must not use an
  index beyond the declared params.
- A form key whose category the language never uses is reported as
  `unused-plural-form` (warning) and dropped by `npm run i18n:sync`.

## Persistence

The language choice is stored under the `wmm.language` localStorage key
through `safeStorageGet` / `safeStorageSet`, so a browser that refuses storage
still renders and simply forgets the choice.

`LanguagePreferenceStore` is the port, not the implementation:

```ts
export interface LanguagePreferenceStore {
  load(): string | null | Promise<string | null>;
  save(preference: LanguagePreference): void | Promise<void>;
}
```

`LanguagePreference` is a `WmmLanguage` or `"auto"`. `"auto"` (the default
when nothing is stored) follows `navigator.languages`, including later
`languagechange` events; a specific language pins it. The Settings page
drafts the choice and applies it with `changeLanguage` only on Save.

A Dexie-backed store plugs in by implementing those two methods and passing
the instance to `new I18nService({ store })`. Because the methods may return
promises, the service starts from the detected language and adopts the stored
value when it resolves — unless `changeLanguage` was called in the meantime,
in which case the explicit choice wins and is not overwritten.

Resolution order at startup: stored language (if it is an available language;
`"auto"` or anything unknown falls through) →
first match from `navigator.languages` (exact tag, then base language, so
`es-AR` resolves to `es-MX`) → `DEFAULT_LANGUAGE`.

## Stability contract

Resource keys are a public contract: themes and user layouts reference them by
name.

- Add new keys freely (non-breaking).
- Rename or remove only with an explicit migration; both are breaking.

## Future XML theme integration

A theme names resources through attributes that end in `Key`. Each one is
resolved with `isWmmResourceKey` and then `i18n.resolve`, so an unknown name
is rejected at theme load time and never reaches the DOM.

```xml
<Button command="wmm.playback.playpause" labelKey="playback.playPause" />
<MenuItem command="wmm.ui.openSettings" labelKey="settings.title" />
<Text resourceKey="library.artists" />
<Panel titleKey="playlist.current" />
<TrackList emptyTextKey="library.noSongsFound" />
<VisualizerSelector titleKey="visualizer.select" />
<DevicePanel titleKey="sync.devices" />
```

The same shape covers templates: `templateKey` names a template resource and
`bindings` fills its positional params, and a theme validator checks that the
binding count equals `getResourceArity(key)`.

```xml
<Text
  templateKey="playback.nowPlayingFormat"
  bindings="player.currentTrack.artist, player.currentTrack.title"
/>
```

`binding="player.currentTrack.title"` is a separate, not yet implemented
namespace of live values. It is deliberately not a resource key: resources are
static text, bindings are values read at render time.

The Theme SDK manifest merges the three registries into one JSON-safe record:

```ts
import { WMM_COMMAND_NAMES, WMM_EVENT_NAMES } from "@/events/taxonomy";
import { exportResourceManifest } from "@/i18n";

export const themeSdk = {
  commands: WMM_COMMAND_NAMES,
  events: WMM_EVENT_NAMES,
  resources: exportResourceManifest(),
};
```

## Out of scope

Phase 1 stops at text. Not implemented here: XML parsing, theme and layout
rendering, the `binding` value namespace, event handling from a theme, and
theme installation.
