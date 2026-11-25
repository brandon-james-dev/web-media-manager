# Metadata providers

`kind: "metadata"` adds an online metadata provider: a search endpoint the app
queries for song tags, whose results the user applies to a song or album.

Like the lyrics and source kinds it is **declarative**. The plugin ships a
`manifest.json` and no code; the host performs the request and maps the
response. An installed metadata plugin never runs third-party code.

## The descriptor

```json
{
  "role": "metadata",
  "id": "itunes-metadata",
  "name": "iTunes Metadata",
  "description": "Look up song tags from the iTunes Search API.",
  "search": {
    "url": "https://itunes.apple.com/search?entity=song&limit=10",
    "params": { "title": "term" },
    "resultsPath": "results",
    "fields": {
      "title": "trackName",
      "artist": "artistName",
      "album": "collectionName",
      "genre": "primaryGenreName",
      "date": "releaseDate",
      "track": "trackNumber",
      "discNumber": "discNumber",
      "coverArtUrl": "artworkUrl100"
    }
  }
}
```

`role` is required and must be `"metadata"`. A lyrics descriptor also carries a
`search` block, so the union needs an explicit discriminator to tell them
apart.

### `provider.search`

| Field | Required | Meaning |
|-------|----------|---------|
| `url` | yes | Absolute `https://` endpoint. An existing query string is preserved. |
| `params` | no | Query field → request parameter name. |
| `query` | no | Literal query parameters sent verbatim on every search. |
| `method` | no | `GET` (default) or `POST`. |
| `body` | no | Request body for a `POST` search. Values may contain `{setting}` placeholders. |
| `headers` | no | Extra request headers. Values may contain `{setting}` placeholders. |
| `resultsPath` | no | Dot path to the record array; omit when the response is the array. |
| `fields` | yes | Result field → JSON field name. |
| `detail` | no | A second request per record, for fields the search omits. |

Query fields are `title`, `artist` and `album`. The panels pass a
pipe-joined `title|artist|album` string; the host splits it and sets only the
parameters the descriptor maps and the query supplies.

Because the endpoint is fetched with the URL API, a `url` that already has a
query string keeps it:

```
https://itunes.apple.com/search?entity=song&limit=10&term=Amarillo+by+Morning
```

`query` covers providers that reject a search without a fixed discriminator.
Apple Music requires `types`, Spotify requires `type`, and neither is a value
the user supplies:

```json
"query": { "types": "songs", "limit": "10" }
```

### `provider.search.detail`

Some providers omit a field from the search response entirely. Spotify returns
no genre on a track: `genres` exists only on `GET /artists/{id}`, and the
`artists` array in a track carries just `id`, `name` and `uri`. `detail` names a
second request per record to fill that gap.

| Field | Required | Meaning |
|-------|----------|---------|
| `url` | yes | Absolute `https://` URL, or a template over dot paths in the search record. |
| `headers` | no | Extra request headers, merged over the search headers. |
| `fields` | yes | Result field → JSON field name on the detail response. `title` and `artist` are not allowed here. |

`url` placeholders are dot paths read from the search record, so
`{artists.0.id}` takes the first artist's id:

```json
"detail": {
  "url": "https://api.spotify.com/v1/artists/{artists.0.id}",
  "fields": { "genre": "genres.0" }
}
```

Three rules keep this safe:

- **The search wins.** A detail field fills only a key the search left unset, so
  a provider that does return a genre is never overridden.
- **A failure is not fatal.** A non-OK response, a network error or a missing
  path leaves the search result intact rather than discarding a usable match.
- **One request per record.** Ten results mean ten detail requests, run in
  parallel. Providers that rate-limit per second will notice; keep `limit` low.

### `provider.albumSearch`

An album lookup is a second descriptor block, so a provider that can search
songs but not albums simply omits it — the album picker then leaves that
provider out.

| Field | Required | Meaning |
|-------|----------|---------|
| `url` | yes | Absolute `https://` endpoint. |
| `params` | no | Query field → request parameter name. |
| `query` | no | Literal parameters sent on every album search. |
| `method` | no | `GET` (default) or `POST`. |
| `body` | no | Request body, expanded from settings. |
| `headers` | no | Extra request headers. |
| `resultsPath` | no | Dot path to the record array; omit when the response is the array. |
| `fields` | yes | Album field → JSON field name. `id` and `title` are required. |
| `detail` | no | Second request per album, same shape and rules as `provider.search.detail`. |
| `tracks` | no | Track list for one album: `url` (a template over `{id}`), `query`, `headers`, `resultsPath`, `fields`. |

`params` maps one query field to one parameter. When that field is blank the
request would carry no query at all, so the service falls back to the other
fields joined by a space — an album search with an empty Album box still sends
`q`.

Spotify's album search returns no genre either, so its `detail` points at the
artist:

```json
"albumSearch": {
  "url": "https://api.spotify.com/v1/search",
  "params": { "album": "q" },
  "query": { "type": "album", "limit": "10" },
  "resultsPath": "albums.items",
  "fields": {
    "id": "id",
    "title": "name",
    "albumArtist": "artists.0.name",
    "year": "release_date",
    "coverArtUrl": "images.0.url"
  },
  "detail": {
    "url": "https://api.spotify.com/v1/artists/{artists.0.id}",
    "fields": { "genre": "genres.0" }
  }
}
```


### `provider.auth`

Some providers answer a search only with a token minted by a separate
endpoint. `auth` declares that exchange; the host performs it before the search
and sends the token on the search request.

| Field | Required | Meaning |
|-------|----------|---------|
| `url` | yes | Absolute `https://` token endpoint. |
| `method` | no | `GET` or `POST` (default). |
| `headers` | no | Request headers. Values may contain `{setting}` placeholders. |
| `body` | no | Request body. Values may contain `{setting}` placeholders. |
| `tokenPath` | yes | Dot path to the token in the response. |
| `header` | no | Header the token is sent in. Defaults to `Authorization`. |
| `prefix` | no | Prefix before the token. Defaults to `Bearer `. |

```json
"auth": {
  "url": "https://accounts.spotify.com/api/token",
  "method": "POST",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": "Basic {base64:credentials}"
  },
  "body": "grant_type=client_credentials",
  "tokenPath": "access_token"
}
```

The exchange runs on every lookup: no token is cached, so an expired token is
never reused. A failed token request throws with the provider name and status,
and a response without a value at `tokenPath` throws rather than sending an
empty header.

### `provider.search.fields`

`title` and `artist` are required: a record without them cannot be shown or
applied. Every other field is optional, and only the fields present are written
on apply.

| Field | Result property |
|-------|-----------------|
| `title` | `title` |
| `artist` | `artist` |
| `album` | `album` |
| `albumArtist` | `albumArtist` |
| `genre` | `genre` |
| `year` | `year` (number) |
| `date` | `date` |
| `track` | `track` (number) |
| `discNumber` | `discNumber` (number) |
| `duration` | `duration` (number, seconds) |
| `isrc` | `isrc` |
| `label` | `label` |
| `composer` | `composer` |
| `coverArtUrl` | `pictures[0].url` as `FrontCover` |

A mapped value is read as a dot path, so `artist-credit.0.name` indexes into an
array. A value of the wrong type is dropped rather than coerced: a `year`
mapped to a string yields no `year`.

## Credentials and header templates

A header value may contain `{key}` placeholders, resolved from the plugin's
settings before the request goes out. That keeps a key out of the archive: the
manifest names the placeholder, the user supplies the value.

```json
{
  "settings": [
    {
      "key": "apiKey",
      "label": "API key",
      "type": "string",
      "default": "",
      "secret": true
    }
  ],
  "provider": {
    "role": "metadata",
    "id": "acme",
    "name": "Acme",
    "search": {
      "url": "https://api.acme.test/search",
      "headers": { "X-Api-Key": "{apiKey}" },
      "fields": { "title": "title", "artist": "artist" }
    }
  }
}
```

| Template | Resolves to |
|----------|-------------|
| `{key}` | The setting's value. |
| `{base64:key}` | The setting's value, base64-encoded from its UTF-8 bytes. |

`{base64:key}` is what makes HTTP basic auth expressible without a dedicated
field: `"Authorization": "Basic {base64:credentials}"` with a secret setting
holding `user:password`.

An unknown placeholder resolves to an empty string, so a missing setting sends
an empty header rather than the literal `{key}`.

A `secret: true` string setting renders as a password input and is stored in
the encrypted secret store, keyed `pluginId:setting`, never in the
`pluginSettings` row. The row keeps the empty default, so a stored key is not
readable from the settings table. Reset and removal clear the stored secrets.

OAuth is not supported: there is no redirect handling, authorization-code
exchange or refresh. A provider that needs a user login rather than a
server-issued token cannot be expressed declaratively today. `provider.auth`
covers the client-credentials shape only.

Note that client credentials put the client secret in the browser, where any
user can read it. That is acceptable for a personal deployment against your own
credentials and not for a shared one; a user-login flow needs the OAuth work
above.

## The registry

`MetadataProviderRegistry` (`@/core/ports`) is the single place the app asks
which providers exist and how to search with one.

```ts
const registry = getMetadataProviderRegistry();
const service = registry.getService("itunes-metadata");
const results = await service?.lookup("Amarillo by Morning|George Strait|");
```

- `listProviders()` returns a cached array whose identity changes only when a
  provider is registered or removed, which is what `useSyncExternalStore` needs.
- `getService(id)` returns a song service or `null`.
- `getAlbumService(id)` returns an album service or `null`; a plugin provider
  has none, so `hasAlbumLookup` is `false` and the album panels skip it.
- `subscribe(listener)` notifies on register and unregister.

Built-ins register through `registerBuiltinMetadataProviders`, so a built-in
and a plugin provider are reached the same way and no lookup switches on a
provider id.

## Install, refresh, remove

`refreshPluginMetadataProviders()` reconciles the registry with the installed
set. It runs at boot from `initializePlugins` and again after every install or
removal, alongside the lyrics and source refreshes.

- A plugin whose `kind` is not `metadata` is skipped.
- A plugin whose descriptor id matches a built-in is skipped: a plugin may not
  shadow a provider the app ships with.
- A provider whose plugin is gone from the store is unregistered.

## Settings

The settings page has an **Online metadata providers** block listing every
registered provider with a Built-in or Plugin badge, and an **Install or manage
metadata plugins** button that opens the shared plugin manager dialog with
`kind="metadata"`.

A plugin provider row carries a settings button that opens the shared plugin
settings dialog for that plugin, so a key declared with `secret: true` can be
entered without leaving the page.

The dialog rejects a manifest of another kind before anything is written:

```
"WebDAV" is a source plugin, but this window installs metadata plugins.
```

## The examples

Three manifests ship, each packed to `public/plugins/<id>-metadata.zip` by
`npm run build:plugins`:

| Example | Needs | Demonstrates |
|---------|-------|--------------|
| `examples/metadata/itunes` | nothing | A plain search with no credentials. |
| `examples/metadata/apple-music` | A developer token | `query` for the required `types=songs`, and a secret bearer token. |
| `examples/metadata/spotify` | Client credentials | `query` for `type=track`, and `auth` client-credentials token exchange. |

The iTunes one targets the iTunes Search API, which sends CORS headers and
needs no credentials, so it works from a browser with no setup. A lookup for
`Amarillo by Morning|George Strait|` returns ten records, the first mapping to
title `Amarillo By Morning`, artist `George Strait`, album `Greatest Hits`,
genre `Country`, date `1982-06-01T12:00:00Z`, track `6` and a cover URL.

Apple Music and Spotify both need credentials before they answer, so they are
documented rather than exercised by the default example. Neither maps
`duration`: both report milliseconds and the result field is seconds, and a
dot-path field map cannot divide.

### Choosing an endpoint

The browser enforces CORS and forbids setting `User-Agent`, so a plugin
endpoint must:

- send `Access-Control-Allow-Origin` for the app's origin, and
- not require a `User-Agent` header.

MusicBrainz, for example, answers a browser request with `406 Not Acceptable`
because it requires a `User-Agent`. The service reports that as
`MusicBrainz Metadata search failed (406)` rather than failing silently.

Both Apple Music and Spotify send CORS headers, so neither is blocked by the
browser: `api.music.apple.com` answers `Access-Control-Allow-Origin: *`, and
`api.spotify.com` and `accounts.spotify.com` echo the requesting origin and
allow `Authorization`.
