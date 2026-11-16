import {
  detectDevice,
  isZuneProductId,
  ObjectProperty,
  Zune,
  ZUNE_VENDOR_ID,
} from "zunesync-ts";
import type {
  SyncDevice,
  SyncLibrary,
  SyncPlaylist,
  SyncTrack,
} from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import type { UsbDeviceInfo } from "../usb";
import { findUsbDevice, WebUsbMtpTransport } from "../zune";

/**
 * Read a Zune's library over MTPZ.
 *
 * A Zune is an MTP device: it has no mountable filesystem, so unlike the iPod
 * there is no directory handle to walk. The library comes from the device's
 * ZMDB database, read over the MTP session the package opens.
 */
export class ZuneDetector implements DeviceDetector {
  async detect(
    _root?: FileSystemDirectoryHandle,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice | undefined> {
    if (!usb || usb.vendorId !== ZUNE_VENDOR_ID) return undefined;
    if (!isZuneProductId(usb.productId)) return undefined;

    const device = await findUsbDevice(usb);
    if (!device) {
      // The descriptors say this is a Zune, so "not my device" is the wrong
      // answer: the device is unplugged, or the origin lost its permission.
      // Returning `undefined` let the scanner fall through to the next
      // detector and report `"device" is not a supported device` instead.
      throw new Error(
        `The ${usb.productName ?? "Zune"} is not available over USB. ` +
          "Reconnect it, then add it again."
      );
    }

    const transport = new WebUsbMtpTransport(device);
    await transport.open();

    let zune: Zune;
    try {
      zune = await Zune.open({
        transport,
        productId: usb.productId,
      });
    } catch (error) {
      // `Zune.open` failed before it owned the session, so nothing else will
      // release the device lease the transport took.
      await transport.close();
      throw error;
    }

    try {
      // A product ID covers several capacities (0x0710 is the whole classic
      // family), so the model is only exact once GetStorageInfo has reported
      // the capacity. `zune.model` applies that, falling back to the family
      // default when the device reported none.
      const model = zune.model ?? detectDevice(usb.productId);

      const library = await zune.readDatabase();

      // The ZMDB `size` field is not trustworthy on every device: a Zune 120
      // records a handful of bytes for tracks whose audio is megabytes. The
      // MTP object knows its real size, so prefer that whenever the database
      // value is implausible.
      //
      // A ZMDB atom id is *sometimes* a valid MTP handle and sometimes not —
      // the reference implementation probes this and falls back to matching by
      // filename (`zune-manager.js:824-858`). Both paths are tried here: the
      // atom id first, then a filename→size map built from the object list.
      //
      // Duration is recovered the same way. A nonzero but implausible ZMDB
      // duration is as bad as a zero one: a Zune 120 reported 324 ms for a
      // 4-minute track, which rendered as 0:00 and made the derived bitrate
      // absurd. Either way the object is asked for the real value.
      const suspicious = library.tracks.filter((track) => {
        const albumYear = library.albums[track.albumRef]?.releaseYear;
        return (
          !isPlausibleDuration(track.duration) ||
          !isPlausibleSize(track.size, track.duration) ||
          !isPlausibleTrackNumber(track.trackNumber) ||
          !albumYear
        );
      });

      const resolved = new Map<
        number,
        { size?: number; duration?: number; filename?: string; year?: number }
      >();
      const unresolved: typeof suspicious = [];

      // `GetObjectPropValue(OriginalDate)` is not answered by every device: a
      // Zune 120 either rejects it with 0xa801 or never answers at all. The
      // read is serialized and the transport cannot cancel it, so issuing it
      // wedges the session — every later transfer fails until the device is
      // unplugged. Measured on hardware: 503 ms for a full scan when the read
      // is never issued, versus 52 s and a dead session when it is.
      //
      // The year therefore comes only from the album record. A classic Zune
      // does not report `OriginalDate`, so probing it costs the whole session
      // and buys nothing.
      await Promise.all(
        suspicious.map(async (track) => {
          const entry: {
            size?: number;
            duration?: number;
            filename?: string;
            year?: number;
          } = {};

          try {
            const info = await zune.getObjectInfo(track.atomId);
            if (info.compressedSize > 0) entry.size = info.compressedSize;
            // The object's filename is the real one; a classic ZMDB track
            // record leaves its filename field empty, so the track number
            // cannot be derived from the database value.
            if (info.filename) entry.filename = info.filename;
          } catch (error) {
            console.warn(
              `[ZuneDetector] GetObjectInfo(atomId 0x${track.atomId.toString(16)}) ` +
                `failed for "${track.title}":`,
              error
            );
          }

          if (!isPlausibleDuration(track.duration)) {
            try {
              const raw = await zune.getObjectPropUint32(
                track.atomId,
                ObjectProperty.Duration
              );
              const duration = normalizeDuration(raw);
              if (duration !== undefined) entry.duration = duration;

              console.debug(
                `[ZuneDetector] "${track.title}" Duration raw=${raw} ` +
                  `normalized=${duration ?? "-"}`
              );
            } catch (error) {
              console.warn(
                `[ZuneDetector] Duration read failed for "${track.title}":`,
                error
              );
            }
          }

          // The ZMDB has no year field on a classic device and the album record
          // carries no FILETIME, so the year stays unresolved here. The
          // `OriginalDate` property that would carry it is not answered by this
          // device, and asking wedges the session (see the note above).

          console.debug(
            `[ZuneDetector] "${track.title}" atom=0x${track.atomId.toString(16)} ` +
              `zmdb(size=${track.size}, duration=${track.duration}) ` +
              `object(size=${entry.size ?? "-"}, duration=${entry.duration ?? "-"})`
          );

          if (
            entry.size !== undefined ||
            entry.duration !== undefined ||
            entry.filename !== undefined ||
            entry.year !== undefined
          ) {
            resolved.set(track.atomId, entry);
            if (entry.size !== undefined) return;
          }
          unresolved.push(track);
        })
      );

      if (unresolved.length > 0) {
        const byFilename = await readSizesByFilename(zune);
        for (const track of unresolved) {
          const size = byFilename.get(track.filename);
          if (size !== undefined) {
            resolved.set(track.atomId, {
              ...resolved.get(track.atomId),
              size,
            });
          }
        }
      }

      const media: SyncLibrary = {
        tracks: library.tracks.map((track) => {
          const fixed = resolved.get(track.atomId);
          // The album record carries the release year; the track record does
          // not, so it is resolved through the track's album reference.
          const album = library.albums[track.albumRef];
          const merged = {
            ...track,
            size: fixed?.size ?? track.size,
            duration: fixed?.duration ?? track.duration,
            filename: fixed?.filename ?? track.filename,
            year: fixed?.year ?? (album?.releaseYear || undefined),
          };
          const mapped = mapTrack(merged);

          // One line per track covering every field the table renders, so a
          // wrong column can be traced to the raw device value rather than
          // guessed at.
          console.debug(
            `[ZuneDetector] "${mapped.title}" ` +
              `track=${track.trackNumber} disc=${track.discNumber} ` +
              `year=${mapped.year ?? "-"} (albumRef=0x${(track.albumRef ?? 0).toString(16)} ` +
              `releaseYear=${album?.releaseYear ?? "-"}) ` +
              `duration=${mapped.durationMs} size=${mapped.fileSize} ` +
              `bitrate=${mapped.bitrate ?? "-"} codec=${track.codecId} ` +
              `rating=${track.rating} plays=${track.playcount}`
          );

          return mapped;
        }),
        playlists: library.playlists.map(mapPlaylist),
        artworks: [],
      };

      // Cover art lives on the album object, so read it once per album and
      // attach it to every track filed under that album. Without this the
      // device's tracks render blank tiles in the app even though the Zune
      // itself shows the artwork.
      const artworkByAlbum = await readAlbumArtwork(zune, library.albums);
      if (artworkByAlbum.size > 0) {
        for (const track of media.tracks) {
          const blob = track.album
            ? artworkByAlbum.get(track.album)
            : undefined;
          if (blob) track.artwork = blob;
        }
      }

      const storage = zune.storageInfo;
      const capacity = storage ? Number(storage.maxCapacity) : undefined;
      const free = storage ? Number(storage.freeSpaceInBytes) : undefined;

      return {
        id: usb.serialNumber ?? `${usb.vendorId}:${usb.productId}`,
        name: model.name,
        productId: usb.productId,
        type: "zune",
        media,
        model: model.name,
        usb,
        capabilities: {
          database: true,
          artwork: false,
          // ZMDB playlists are read-only here: the package has no writer.
          playlists: false,
          playbackStats: false,
        },
        storage: {
          capacityBytes: capacity,
          usedBytes:
            capacity != null && free != null ? capacity - free : undefined,
        },
        serialNumber: usb.serialNumber,
        createdAt: Date.now(),
        connected: true,
      };
    } finally {
      await zune.disconnect();
    }
  }
}

/**
 * Below this, a track's ZMDB size is treated as unreliable and the MTP object
 * is asked instead. No real audio track is under a kilobyte, while the values
 * a Zune 120 records for them are single digits.
 */
const MIN_PLAUSIBLE_TRACK_BYTES = 1024;

/**
 * Below this, a track's ZMDB duration is treated as unreliable. No real track
 * is under a second, while the values a Zune 120 records are a few hundred
 * milliseconds.
 */
const MIN_PLAUSIBLE_DURATION_MS = 1000;

/**
 * Whether a ZMDB `duration` is believable. A zero or sub-second value is not:
 * it renders as 0:00 and makes any derived bitrate meaningless.
 */
function isPlausibleDuration(durationMs: number): boolean {
  return durationMs >= MIN_PLAUSIBLE_DURATION_MS;
}

/**
 * Normalize a device `Duration` value to milliseconds.
 *
 * MTP specifies milliseconds, but a Zune 120 answered 240 for a 4-minute
 * track — seconds. A value too small to be milliseconds yet sane as seconds is
 * therefore read as seconds. Anything else implausible yields `undefined`, so
 * the caller keeps the database value rather than inventing one.
 */
function normalizeDuration(raw: number): number | undefined {
  if (isPlausibleDuration(raw)) return raw;

  const asSeconds = raw * 1000;
  if (raw > 0 && isPlausibleDuration(asSeconds)) return asSeconds;

  return undefined;
}

/**
 * Whether a ZMDB `size` is believable for a track of this duration.
 *
 * A flat byte floor is not enough: a Zune 120 recorded 64 KB for a track whose
 * audio is 4.9 MB, which clears any small threshold while still being wrong.
 * Even a very low bitrate track is at least as many bytes as it is
 * milliseconds long (8 kbps), so size is checked against duration. A track
 * with no duration falls back to the flat floor.
 */
function isPlausibleSize(size: number, durationMs: number): boolean {
  if (size < MIN_PLAUSIBLE_TRACK_BYTES) return false;
  if (durationMs > 0) return size >= durationMs;
  return true;
}

/**
 * Object sizes keyed by filename, read from the device's object list.
 *
 * Used when a ZMDB atom id is not a valid MTP handle: the reference
 * implementation resolves handles by filename in that case
 * (`zune-manager.js:848-858`). A failure here is not fatal — the caller keeps
 * the database value.
 */
async function readSizesByFilename(zune: {
  listObjects: (formatCode?: number, parentHandle?: number) => Promise<number[]>;
  getObjectInfo: (handle: number) => Promise<{ compressedSize: number; filename: string }>;
}): Promise<Map<string, number>> {
  const byFilename = new Map<string, number>();

  try {
    const handles = await zune.listObjects(0, 0);
    await Promise.all(
      handles.map(async (handle) => {
        try {
          const info = await zune.getObjectInfo(handle);
          if (info.filename && info.compressedSize > 0) {
            byFilename.set(info.filename, info.compressedSize);
          }
        } catch {
          // A handle that cannot be read is simply not in the map.
        }
      })
    );
  } catch (error) {
    console.warn("[ZuneDetector] could not list device objects:", error);
  }

  return byFilename;
}

/**
 * Cover art for each album on the device, keyed by album title.
 *
 * Artwork is stored on the album object as `RepresentativeSampleData`. The
 * album's ZMDB atom id is tried first; when that is not a valid MTP handle the
 * album objects are enumerated and matched by their `<artist>--<album>.alb`
 * filename, the same fallback the reference implementation uses for tracks.
 */
async function readAlbumArtwork(
  zune: {
    readAlbumArtwork: (handle: number) => Promise<Uint8Array | undefined>;
    listObjects: (formatCode?: number, parentHandle?: number) => Promise<number[]>;
    getObjectInfo: (handle: number) => Promise<{ filename: string }>;
  },
  albums: Record<string, { atomId: number; title: string; artistName: string }>
): Promise<Map<string, Blob>> {
  const byAlbum = new Map<string, Blob>();
  const unresolved: { title: string; filename: string }[] = [];

  await Promise.all(
    Object.values(albums).map(async (album) => {
      const data = await zune.readAlbumArtwork(album.atomId);
      if (data) {
        byAlbum.set(album.title, new Blob([new Uint8Array(data)], { type: "image/jpeg" }));
        return;
      }
      unresolved.push({
        title: album.title,
        filename: `${album.artistName}--${album.title}.alb`,
      });
    })
  );

  if (unresolved.length === 0) return byAlbum;

  // No fallback by filename. Resolving an unresolved album meant calling
  // `GetObjectInfo` on every album handle from `listObjects(0xba03, 0)`, and a
  // Zune 120 does not answer that for album objects: each call burned the full
  // 15 s timeout and then wedged the session, so the remaining calls failed
  // with GenericFailure. Measured on hardware with 14 tracks and 12 albums:
  // 70453 ms for a full scan, of which 68 s was four timed-out album reads.
  // The primary pass above already reads artwork from every album's own
  // handle, so an album missing there simply has no artwork on the device.
  return byAlbum;
}

/**
 * A track number the device database can be trusted to have recorded.
 *
 * A Zune 120 answered 12297 (`0x3009`, the MP3 object format) at the track
 * number offset for every track, so the field cannot be used as-is. Anything
 * outside a sane range falls back to the leading number in the filename, which
 * is how the files were named in the first place.
 */
function resolveTrackNumber(
  trackNumber: number,
  filename: string
): number | undefined {
  if (isPlausibleTrackNumber(trackNumber)) return trackNumber;

  const match = /^(\d{1,3})[\s._-]/.exec(filename);
  if (!match) return undefined;

  const derived = Number(match[1]);
  return derived > 0 ? derived : undefined;
}

/** Whether a device track number is in the range a real track number occupies. */
function isPlausibleTrackNumber(trackNumber: number): boolean {
  return trackNumber > 0 && trackNumber < 1000;
}

function mapTrack(track: {
  atomId: number;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  trackNumber: number;
  discNumber: number;
  duration: number;
  size: number;
  playcount: number;
  rating: number;
  codecId: number;
  filename: string;
  year?: number;
}): SyncTrack {
  return {
    id: track.atomId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArtist: track.albumArtist || undefined,
    genre: track.genre,
    year: track.year,
    trackNumber: resolveTrackNumber(track.trackNumber, track.filename),
    discNumber: track.discNumber || undefined,
    durationMs: track.duration,
    fileSize: track.size,
    playCount: track.playcount || undefined,
    rating: track.rating || undefined,
    codecId: track.codecId || undefined,
    // The ZMDB carries no bitrate field, so the column rendered "undefined".
    // It is derivable: bits per millisecond is kilobits per second. Guarded on
    // a plausible duration, or an implausible one yields absurd values.
    bitrate:
      track.size > 0 && isPlausibleDuration(track.duration)
        ? Math.round((track.size * 8) / track.duration)
        : undefined,
    path: track.filename,
  };
}

function mapPlaylist(playlist: {
  atomId: number;
  name: string;
  trackAtomIds: number[];
}): SyncPlaylist {
  return {
    id: BigInt(playlist.atomId),
    name: playlist.name,
    trackIds: playlist.trackAtomIds,
  };
}
