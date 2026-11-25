# 02 · Lyrics providers

Covers `kind: "lyrics"`: the `provider.search` descriptor, how the host drives
it, how results are ranked, and how a provider is registered.

## 1. Manifest

```json
{
  "id": "example-lyrics",
  "name": "Example Lyrics",
  "version": "1.0.0",
  "kind": "lyrics",
  "provider": {
    "id": "example-lyrics",
    "name": "Example Lyrics",
    "search": {
      "url": "https://lyrics.example.test/api/search",
      "params": { "title": "track_name", "artist": "artist_name" },
      "headers": { "X-Client": "web-media-manager" },
      "resultsPath": "data",
      "fields": {
        "id": "id",
        "title": "trackName",
        "artist": "artistName",
        "album": "albumName",
        "duration": "duration",
        "plainLyrics": "plainLyrics",
        "syncedLyrics": "syncedLyrics"
      }
    }
  }
}
```

A lyrics plugin is declarative: no `runtime`, no `entry`, no code. The host
builds the request and reads the response itself.

## 2. `provider.search`

| Field | Required | Notes |
|-------|----------|-------|
| `url` | yes | Absolute `https://` endpoint. `http://` is rejected. |
| `params` | no | Query field → request parameter name. |
| `headers` | no | Extra request headers, e.g. a client identifier. |
| `resultsPath` | no | Dot path to the record array. Omit when the response is the array. |
| `fields` | yes | Result field → JSON field name on a record. |

Query fields a provider can forward: `title`, `artist`, `album`, `duration`.

Result fields: `id`, `title`, `artist`, `album`, `duration`, `plainLyrics`,
`syncedLyrics`, `hasWordSync`, `instrumental`. `title` and `artist` are
required — a record without them cannot be shown or ranked. Everything else is
optional, and a provider that returns only `plainLyrics` is valid.

## 3. Registration and lookup

- `createLyricsProviderRegistry()` builds the registry; the built-in LRCLIB
  provider registers at boot from `registerBuiltinLyricsProviders`.
- `refreshPluginLyricsProviders()` reconciles the registry with the installed
  plugin set: it registers a provider for each installed lyrics plugin and
  unregisters the ids it registered before that are now gone.
- A plugin provider id that collides with a built-in id is refused, so a plugin
  cannot shadow LRCLIB.
- `searchLyrics(providerId, query)` resolves one provider's service from the
  registry and searches it; an unknown id throws. `rankLyricsResults` then
  scores that provider's results against the query.

## 4. Ranking

`rankLyricsResults` blends per-record signals into a `matchScore` from 0 to 1:
title, artist and album similarity, plus how close the record's duration is to
the track being played. A duration further apart than the configured window
scores zero on that signal. The score reads only provider-neutral result fields,
so results from different providers rank against each other on equal terms.
## 5. LRCLIB settings

LRCLIB accepts an optional application identifier, which raises its rate limit.
It is stored through the `LyricsSettingsStore` port, not in the plugin record,
and edited in the lyrics settings dialog. The dialog opens from the settings
button on the LRCLIB row in Settings, next to its `Built-in` badge — the same
placement the visualizer list uses for its configure action.

A provider declares that it has settings with `hasSettings: true` on its
descriptor, so the row renders the button from the descriptor rather than from
a hardcoded id check.
