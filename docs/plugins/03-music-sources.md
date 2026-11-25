# 03 · Music sources

Covers `kind: "source"`: the `provider.library` and `provider.stream`
descriptors, how the host reads a library and streams a song, how secrets are
stored, and the bundled WebDAV example.

## 1. Manifest

```json
{
  "id": "webdav-source",
  "name": "WebDAV",
  "version": "0.1.0",
  "kind": "source",
  "provider": {
    "id": "webdav",
    "name": "WebDAV",
    "description": "Read a music library from a WebDAV share.",
    "config": [
      { "key": "baseUrl", "label": "Server URL", "required": true },
      { "key": "username", "label": "Username", "required": true },
      { "key": "password", "label": "Password", "required": true, "secret": true }
    ],
    "library": {
      "url": "{baseUrl}",
      "method": "PROPFIND",
      "body": "<?xml version=\"1.0\"?><d:propfind xmlns:d=\"DAV:\"><d:prop><d:displayname/><d:getcontentlength/></d:prop></d:propfind>",
      "headers": { "Depth": "infinity", "Content-Type": "application/xml; charset=utf-8" },
      "recordTag": "d:response",
      "fields": {
        "id": "href",
        "title": "displayname",
        "artist": "displayname",
        "fileSize": "getcontentlength",
        "path": "href"
      }
    },
    "stream": { "url": "{baseUrl}/{path}" }
  }
}
```

A source plugin is declarative: no `runtime`, no `entry`, no code. The host
issues the listing request, maps the records to songs and streams the bytes.

## 2. `provider.config`

Each entry becomes one field in the add-source form.

| Field | Required | Notes |
|-------|----------|-------|
| `key` | yes | Config key; also the `{key}` a URL template can reference. |
| `label` | yes | Field label. |
| `placeholder` | no | Input placeholder. |
| `required` | no | The form refuses to submit without a value. |
| `secret` | no | Renders a password input and keeps the value out of the source record. |

A `secret` value is written to the platform secret store under the
`plugin-source` namespace, keyed by source id, and deleted with the source. It
never lands in the `PluginMusicSource` record, which holds only non-secret
config. Secrets are resolved on the main thread and threaded into job payloads,
because workers cannot read IndexedDB secrets.

## 3. `provider.library`

| Field | Required | Notes |
|-------|----------|-------|
| `url` | yes | Absolute `https://` endpoint, or a template using `{baseUrl}`. |
| `method` | no | `GET` (default) or `PROPFIND`. |
| `body` | no | Request body, e.g. a WebDAV propfind. |
| `headers` | no | Extra request headers. Values may contain `{config}` placeholders. |
| `resultsPath` | no | Dot path to the record array, for JSON responses. |
| `recordTag` | no | XML record element name; switches the response to XML parsing. |
| `fields` | yes | Record field → JSON path, or child element local name for XML. |

Record fields: `id`, `title`, `artist`, `album`, `albumArtist`, `duration`,
`track`, `discNumber`, `genre`, `year`, `bitrate`, `fileSize`, `path`,
`streamUrl`, `coverArtUrl`. `id`, `title` and `artist` are required — a record
without them cannot become a song.

### JSON responses

The body is read once and parsed as JSON. `resultsPath` selects the array when
the records are nested; omit it when the response is the array itself.

### XML responses

Setting `recordTag` switches to XML. Each element with that tag becomes one flat
record, and `fields` then names child element **local names** rather than JSON
paths — `getcontentlength`, not `d:getcontentlength`. Namespaced tags match on
their local name, so `d:response` and `response` both work.

The splitter is deliberately small, not a general XML parser: it runs in a
worker, where `DOMParser` does not exist, and a WebDAV listing is a flat,
well-formed document.

## 4. `provider.stream`

| Field | Required | Notes |
|-------|----------|-------|
| `url` | yes | Absolute `https://` URL, or a template. |
| `headers` | no | Extra request headers. Values may contain `{config}` placeholders. |

Templates may reference `{baseUrl}` in both `library.url` and `stream.url`, and
`{id}` and `{path}` from the record being played in `stream.url`.

A header value may also reference the source's config and its stored secret:

| Template | Resolves to |
|----------|-------------|
| `{key}` | A non-secret config value, e.g. `{baseUrl}` or a username field. |
| `{secret}` | The value stored for the field marked `secret: true`. |
| `{base64:key}` | Any of the above, base64-encoded from its UTF-8 bytes. |

That is what makes basic auth work without the credential entering the source
record:

```json
{
  "config": [
    { "key": "baseUrl", "label": "Server URL", "required": true },
    { "key": "password", "label": "Password", "secret": true }
  ],
  "library": {
    "url": "{baseUrl}/library",
    "headers": { "Authorization": "Basic {base64:secret}" },
    "fields": { "id": "id", "title": "title", "artist": "artist" }
  }
}
```

The secret is read from the encrypted store at request time, so it never
appears in the `MusicSource` record or in an exported config.

## 5. What a plugin source can do

`PluginSourceStrategy` implements `IMusicSourceStrategy` and reports fixed
capabilities:

| Capability | Value | Why |
|------------|-------|-----|
| `streaming` | true | `provider.stream` resolves bytes. |
| `browsing` | true | The library listing is browsable. |
| `searching` | false | No search endpoint in the descriptor. |
| `metadataWrite` | false | A plugin source is read-only. |
| `libraryScanning` | false | Listing is on demand, not a scan. |
| `offline` | false | No offline copy path. |
| `playlistWrite`, `syncWrite` | false | Read-only. |

A plugin source is read-only by design: it can add songs and stream them, and it
cannot write tags back or accept a sync.

## 6. Registration and dispatch

- `pluginSourceRegistry` maps provider id → descriptor. It is worker-safe and
  subscribable, and `usePluginSourceStrategies` reads it through
  `useSyncExternalStore`.
- `refreshPluginSourceStrategies()` reconciles it with the installed set, called
  from `initializePlugins` and from the install and remove mutations.
- `getStrategyForSource(source)` resolves a `PluginMusicSource` through the
  registry on the main thread.
- `getStrategy(kind, descriptor)` builds one from a job payload in the worker,
  so the worker needs no plugin store. `MusicSourceImportConfig` carries
  `sourceProvider` for exactly that reason.

## 7. The WebDAV example

`examples/sources/webdav/manifest.json`, packed to
`public/plugins/webdav-source.zip` by `npm run build:plugins`.

It declares three config fields (Server URL, Username, Password as `secret`), a
`PROPFIND` listing with `Depth: infinity` and a propfind body, `recordTag:
"d:response"` for the XML response, and a `{baseUrl}/{path}` stream template.

Install it from Settings → Music sources → Install or manage music source
plugins, then add it from Add Music Source, where it appears beside the built-in
kinds with its manifest name and description.

Note that the example maps `title` and `artist` to `displayname`, because a
WebDAV listing carries no tags. A real deployment would point `fields` at a
sidecar index or a server that returns tags.
