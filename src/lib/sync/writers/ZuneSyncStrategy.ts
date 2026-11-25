import type { Playlist, Song, SyncDevice } from "@/models";
import type {
  ISyncStrategy,
  SyncProgressHandler,
  SyncSummary,
} from "./ISyncStrategy";
import { createDbSession } from "./ISyncStrategy";
import { Zune, type ZuneTrackUpload } from "zunesync-ts";
import { findUsbDevice, WebUsbMtpTransport } from "../zune";
import { trackIdentity } from "../helpers";
import { resolveSongBytesWithCache, resolveThroughSource } from "@/lib/offline";
import { getArtworkForSong } from "@/lib/metadata/artwork/getArtworkForSong";

/** Reads a song's audio, whatever source it comes from. */
export type ZuneSongBytesResolver = (
  song: Song
) => Promise<ArrayBuffer | null>;

/** How many times the device database is re-read before giving up. */
/**
 * How long to keep re-reading the ZMDB while waiting for the device to
 * publish the tracks just written.
 *
 * This was a fixed count of 6 attempts at 400 ms — about 2.4 s. A Zune 120
 * holds far more than a Zune 8 and takes longer to rebuild its database, so
 * the window expired first and every track was reported "written but not
 * found" even though the music was on the device and played. A time budget
 * scales with the device instead of assuming a small library.
 */
const VERIFY_TIMEOUT_MS = 20_000;

/** Delay between verification re-reads, in milliseconds. */
const VERIFY_INTERVAL_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Identities of every track in a parsed device library. */
function identitiesOf(library: {
  tracks: { title?: string; album?: string; artist?: string }[];
}): Set<string> {
  return new Set(
    library.tracks.map((track) =>
      trackIdentity(track.title, track.album, track.artist)
    )
  );
}

/**
 * Identity keys for a track, most specific first.
 *
 * The exact title+album+artist key is what the queue filter uses, but a
 * device-side reference can fail to resolve: when the album object is
 * rejected (`0xa801` on its `Name`), the stored track's album comes back
 * empty and the exact key misses even though the track is listed. Falling
 * back to title+artist and then title keeps a written track from being
 * reported as missing.
 */
function identityKeys(title?: string, album?: string, artist?: string): string[] {
  return [
    trackIdentity(title, album, artist),
    trackIdentity(title, "", artist),
    trackIdentity(title, "", ""),
  ];
}

/**
 * Cover art for a song, as the bytes the device stores in its artwork sample.
 *
 * The device keeps artwork per track object (`RepresentativeSampleData`), so
 * without this every synced track showed a blank tile. The largest stored
 * image is used: the device scales it down itself, and a thumbnail would look
 * soft on the Zune's own display.
 */
async function resolveAlbumArt(
  song: Song
): Promise<{ data: Uint8Array; format: number } | undefined> {
  try {
    const rows = await getArtworkForSong(song.id);
    const blob = rows
      .map((row) => row.full ?? row.thumb512 ?? row.thumb256 ?? row.thumb128)
      .find((candidate): candidate is Blob => Boolean(candidate));

    if (!blob) return undefined;

    const data = new Uint8Array(await blob.arrayBuffer());
    if (data.byteLength === 0) return undefined;

    return { data, format: 0x3801 };
  } catch (error) {
    console.warn(
      `[ZuneSyncStrategy] could not read artwork for "${song.title ?? song.filename}":`,
      error
    );
    return undefined;
  }
}

/**
 * Resolve a song's bytes, preferring the offline cache.
 *
 * A sync job runs in a worker, where a remote source's credentials are
 * unreachable, so a song that is not cached cannot be read there at all. The
 * cache is checked first for every source, which also keeps a local song
 * readable if its folder is gone.
 */
const resolveCachedFirst: ZuneSongBytesResolver = async (song) =>
  await resolveSongBytesWithCache(song, resolveThroughSource);

/**
 * Write songs to a Zune over MTPZ.
 *
 * A Zune is an MTP device, so there is no filesystem to copy into: tracks are
 * uploaded as MTP objects and the device's ZMDB database is what lists them.
 * The package's `uploadTracks` creates the artist and album objects a track
 * needs to be filed correctly, and a `ZuneSync` session rolls the whole batch
 * back if it fails part-way.
 */
export class ZuneSyncStrategy implements ISyncStrategy {
  private readonly resolveBytes: ZuneSongBytesResolver;
  private readonly verifyTimeoutMs: number;

  constructor(
    resolveBytes: ZuneSongBytesResolver = resolveCachedFirst,
    verifyTimeoutMs: number = VERIFY_TIMEOUT_MS
  ) {
    this.resolveBytes = resolveBytes;
    this.verifyTimeoutMs = verifyTimeoutMs;
  }

  canHandle(device: SyncDevice): boolean {
    return device.type === "zune";
  }

  async sync(
    device: SyncDevice,
    songs: Song[],
    _playlists: Playlist[],
    onProgress?: SyncProgressHandler
  ): Promise<SyncSummary> {
    const summary: SyncSummary = {
      added: [],
      unverified: [],
      alreadyPresent: [],
      skipped: [],
    };

    const usb = device.usb;
    if (!usb) throw new Error("The device has no USB information");

    const usbDevice = await findUsbDevice(usb);
    if (!usbDevice) throw new Error("The Zune is not connected");

    const transport = new WebUsbMtpTransport(usbDevice);
    await transport.open();

    let zune: Zune;
    try {
      zune = await Zune.open({ transport, productId: usb.productId });
    } catch (error) {
      await transport.close();
      throw error;
    }

    try {
      const library = await zune.readDatabase();
      const existing = new Set(
        library.tracks.map((track) =>
          trackIdentity(track.title, track.album, track.artist)
        )
      );

      const uploads: ZuneTrackUpload[] = [];
      const uploaded: { song: Song; key: string }[] = [];
      const uploadedBytes = new Map<string, number>();
      let completed = 0;

      for (const song of songs) {
        const key = trackIdentity(song.title, song.album, song.artist);

        if (existing.has(key)) {
          summary.alreadyPresent.push(song.id);
          completed += 1;
          onProgress?.(completed, songs.length, {
            songId: song.id,
            status: "present",
          });
          continue;
        }

        const bytes = await this.resolveBytes(song);
        if (!bytes) {
          // The audio could not be read (file moved, not cached). Skip it and
          // keep syncing the rest, but record it so the caller can retry.
          console.warn(
            `[ZuneSyncStrategy] skipping "${song.title ?? song.filename}": audio not available`
          );
          summary.skipped.push(song.id);
          completed += 1;
          onProgress?.(completed, songs.length, {
            songId: song.id,
            status: "skipped",
          });
          continue;
        }

        uploads.push({
          data: new Uint8Array(bytes),
          filename: song.filename || `${song.title ?? "track"}.mp3`,
          metadata: {
            name: song.title ?? undefined,
            artist: song.artist,
            albumName: song.album,
            albumArtist: song.albumArtist,
            genre: song.genre,
            track: song.track,
            // MTP specifies `Duration` in milliseconds, but `Song.duration` is
            // seconds (the source mappers divide `durationMs` by 1000). Writing
            // it raw stored 240 for a 4-minute track, which is why the device
            // reported seconds back on the next scan.
            duration:
              song.duration != null ? Math.round(song.duration * 1000) : undefined,
            albumArt: await resolveAlbumArt(song),
          },
        });
        uploaded.push({ song, key });
        uploadedBytes.set(key, bytes.byteLength);
        existing.add(key);
      }

      if (uploads.length > 0) {
        const session = zune.createSession();
        await session.begin();

        // Commit the device database after every track, not once at the end.
        // An upload writes the MTP object first and the ZMDB lists it second,
        // so a run stopped part-way used to leave objects nothing recorded.
        const db = createDbSession(() => session.commit());

        const onWarning = (what: string, error: unknown) => {
          // A rejected artist/album object is not fatal: the tracks are still
          // transferred, they just are not filed under it.
          console.warn(
            `[ZuneSyncStrategy] The device rejected the ${what} object:`,
            error
          );
        };

        // Indexed by upload position, so the verification pass below can pair
        // each handle with the song it belongs to.
        const handles: number[] = Array.from<number>({
          length: uploads.length,
        });
        let written = 0;

        try {
          // Group by album so each track is filed under an artist and album
          // object, which is what `uploadTracks` does in a single call. The
          // grouping key matches the library's.
          const groups = new Map<string, number[]>();
          for (const [index, upload] of uploads.entries()) {
            const meta = upload.metadata ?? {};
            const key = `${meta.albumArtist ?? meta.artist ?? ""}\u0000${meta.albumName ?? ""}`;
            const group = groups.get(key);
            if (group) group.push(index);
            else groups.set(key, [index]);
          }

          for (const indices of groups.values()) {
            const first = uploads[indices[0]].metadata ?? {};
            const albumName = first.albumName;
            let artistId: number | undefined;

            if (albumName) {
              const artistName = first.albumArtist ?? first.artist;
              if (artistName) {
                try {
                  artistId = await zune.createArtist(artistName, { session });
                } catch (error) {
                  onWarning(`artist "${artistName}"`, error);
                }
              }
              try {
                await zune.createAlbum(
                  { name: albumName, albumArtist: artistName, artistId },
                  { session }
                );
              } catch (error) {
                onWarning(`album "${albumName}"`, error);
              }
            }

            for (const index of indices) {
              const upload = uploads[index];
              handles[index] = await zune.uploadTrack(
                {
                  ...upload,
                  metadata: { ...upload.metadata, artistId, albumName },
                },
                { session, onWarning }
              );

              // Commit before reporting, so a run that stops here leaves a
              // track the device lists rather than an unrecorded object.
              db.markDirty();
              await db.commit();

              written += 1;
              onProgress?.(written, songs.length, {
                songId: uploaded[index]?.song.id ?? "",
                status: "written",
              });
            }
          }
        } catch (error) {
          await session.rollback();
          throw error;
        }

        // Verify against the MTP objects themselves. The ZMDB is a separate
        // file the device rebuilds on its own schedule, and on a Zune 120 it
        // can omit tracks whose objects exist and play. `GetObjectInfo` on the
        // handle the device assigned is direct evidence the object is there,
        // and it reports the size the device actually stored.
        const objects = new Map<string, number>();
        const responded = new Set<number>();
        for (const handle of handles) {
          try {
            const info = await zune.getObjectInfo(handle);
            responded.add(handle);
            if (info.filename) objects.set(info.filename, info.compressedSize);
          } catch {
            // The object is gone; the ZMDB check below still gets a chance.
          }
        }

        // Flush before re-reading: the device does not rebuild its ZMDB as
        // objects arrive, so an immediate re-read returns the pre-sync
        // database and every uploaded song looks missing. `SyncDeviceDB(1)`
        // is what makes the device record them.
        await zune.syncDeviceDB(1);

        // Confirm the writes landed. The device publishes the flushed tracks
        // asynchronously, so the first re-read can still return the pre-sync
        // database; poll until every uploaded song is listed or the attempts
        // run out. A write the device never records must not be reported as
        // synced.
        const wanted = uploaded.map(({ song }) =>
          identityKeys(song.title, song.album, song.artist)
        );

        const settled = (present: ReadonlySet<string>): boolean =>
          uploaded.every((_entry, index) => {
            const filename = uploads[index]?.filename;
            const handle = handles[index];
            return (
              (filename !== undefined && objects.has(filename)) ||
              (handle !== undefined && responded.has(handle)) ||
              wanted[index].some((key) => present.has(key))
            );
          });

        let after = await zune.readDatabase();
        let present = identitiesOf(after);

        // Poll until the device lists every uploaded song or the budget runs
        // out. Time-based, not attempt-based: a larger device needs longer.
        const deadline = Date.now() + this.verifyTimeoutMs;
        while (!settled(present) && Date.now() < deadline) {
          await delay(VERIFY_INTERVAL_MS);
          after = await zune.readDatabase();
          present = identitiesOf(after);
        }

        const deviceSizes = new Map(
          after.tracks.map((track) => [
            trackIdentity(track.title, track.album, track.artist),
            track.size,
          ])
        );

        for (const [index, { song, key }] of uploaded.entries()) {
          const keys = identityKeys(song.title, song.album, song.artist);
          const filename = uploads[index]?.filename;
          const handle = handles[index];
          const objectSize =
            filename !== undefined ? objects.get(filename) : undefined;
          const verified =
            objectSize !== undefined ||
            (handle !== undefined && responded.has(handle)) ||
            keys.some((candidate) => present.has(candidate));
          if (verified) {
            summary.added.push(song.id);
          } else {
            summary.unverified.push(song.id);
            console.warn(
              `[ZuneSyncStrategy] "${song.title ?? song.filename}" was written but not found on the device`
            );
          }

          // The device records its own size for the object. A size that does
          // not match the bytes sent means the track was stored truncated,
          // which plays as a skip or not at all — worth surfacing even when
          // the track is listed.
          const sent = uploadedBytes.get(key);
          const stored =
            objectSize ??
            keys
              .map((candidate) => deviceSizes.get(candidate))
              .find((value) => value !== undefined);
          if (verified && sent !== undefined && stored !== undefined && stored !== sent) {
            console.warn(
              `[ZuneSyncStrategy] "${song.title ?? song.filename}" stored ${stored} bytes but ${sent} were sent`
            );
          }

          completed += 1;
          onProgress?.(completed, songs.length, {
            songId: song.id,
            status: verified ? "verified" : "unverified",
          });
        }
      }
    } finally {
      await zune.disconnect();
    }

    return summary;
  }

  /** Delete tracks from the device by their ZMDB atom ids (`SyncTrack.id`). */
  async removeTracks(
    device: SyncDevice,
    trackIds: number[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    if (trackIds.length === 0) return;

    const usb = device.usb;
    if (!usb) throw new Error("The device has no USB information");

    const usbDevice = await findUsbDevice(usb);
    if (!usbDevice) throw new Error("The Zune is not connected");

    const transport = new WebUsbMtpTransport(usbDevice);
    await transport.open();

    let zune: Zune;
    try {
      zune = await Zune.open({ transport, productId: usb.productId });
    } catch (error) {
      await transport.close();
      throw error;
    }

    try {
      for (const [index, trackId] of trackIds.entries()) {
        try {
          await zune.deleteObject(trackId);
        } catch (error) {
          // A stale id (already removed elsewhere) must not stop the rest.
          console.warn(
            `[ZuneSyncStrategy] cannot remove track ${trackId}:`,
            error
          );
        }

        onProgress?.(index + 1, trackIds.length);
      }

      await zune.syncDeviceDB(1);
    } finally {
      await zune.disconnect();
    }
  }
}
