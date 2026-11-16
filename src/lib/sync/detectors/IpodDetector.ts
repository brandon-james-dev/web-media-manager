import {
  checksumTypeForGeneration,
  createBrowserFs,
  detectDevice,
  Itdb,
  writeSysInfo,
} from "itunesdb-ts";
import type {
  SyncArtwork,
  SyncDevice,
  SyncLibrary,
  SyncPlaylist,
  SyncTrack,
} from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { uuidv7 } from "uuidv7";
import { mapUsbDevice, USB_DEVICE_FILTERS } from "../usb";
import type { UsbDeviceInfo } from "../usb";
import { getDirectorySize } from "../helpers/getDirectorySize";

/**
 * Encode raw RGBA pixels as a PNG blob.
 *
 * The device stores cover art as raw pixels in `.ithmb` files, which no `<img>`
 * can render. `OffscreenCanvas` is available in every browser this app targets
 * and in workers; when it is missing the track simply has no art.
 */
async function rgbaToPngBlob(image: {
  width: number;
  height: number;
  pixels: Uint8Array;
}): Promise<Blob | null> {
  if (typeof OffscreenCanvas === "undefined") return null;

  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  if (!context) return null;

  const expected = image.width * image.height * 4;
  if (image.pixels.length < expected) return null;

  const pixels = new Uint8ClampedArray(expected);
  pixels.set(image.pixels.subarray(0, expected));

  context.putImageData(
    new ImageData(pixels, image.width, image.height),
    0,
    0
  );

  return await canvas.convertToBlob({ type: "image/png" });
}

export class IpodDetector implements DeviceDetector {
  async detect(
    root?: FileSystemDirectoryHandle,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice | undefined> {
    // An iPod is a mass-storage device, so it is only detectable once its
    // storage root has been picked. Returning undefined lets the scan move on
    // to the next detector; throwing here aborted every rootless scan, which
    // is how adding an MTP player (a Zune) failed with "root directory not
    // found" before its own detector was ever tried.
    if (!root) return undefined;
    const usbInfo = usb ?? (await this.tryGetUsbInfo());
    const device = usbInfo?.productId
      ? detectDevice(usbInfo.productId)
      : ({} as ReturnType<typeof detectDevice>);

    // The FireWire GUID for the hash58 checksum is the device's USB serial
    // number (nano 4G, classic): SysInfo is often empty on these models.
    if (usbInfo?.serialNumber) {
      device.firewireGuid = usbInfo.serialNumber;
      device.serialNumber = usbInfo.serialNumber;
    }

    if (!device.name) throw new Error("Unable to detect the iPod model");
    const model = device.name;

    const itdb = await Itdb.open(createBrowserFs(root), {
      device,
    });
    let resolved:
      Awaited<ReturnType<typeof Itdb.open>>["resolvedDevice"] | undefined;

    // Filled inside the try, before the handle is released: `dispose()`
    // empties the database's track, playlist and artwork arrays.
    let playlists: SyncPlaylist[] = [];
    let artworks: SyncArtwork[] = [];
    let tracks: SyncTrack[] = [];

    try {
      // Carry the on-device GUID/serial onto the resolved device so the
      // hash58 checksum works on devices that need it (nano 3/4G, classic).
      resolved = itdb.resolvedDevice;
      if (resolved?.firewireGuid) {
        device.firewireGuid = resolved.firewireGuid;
        device.serialNumber = resolved.serialNumber ?? device.serialNumber;
      }

      // One-time setup (mirrors tunesreloaded's FirewireSetup.performSetup):
      // "encrypted" models — those whose iTunesDB needs a checksum (hash58 /
      // hash72 / hashAB) — require `FirewireGuid` and `ModelNumStr` written
      // into SysInfo before a checksum-written DB will be accepted. The GUID
      // is just the USB serial number. Idempotent: only written when the
      // resolved device has no GUID yet, only on models that need it.
      const needsChecksum =
        checksumTypeForGeneration(resolved?.generation ?? device.generation) !==
        "none";
      if (needsChecksum && usbInfo?.serialNumber && !device.firewireGuid) {
        try {
          await writeSysInfo(
            createBrowserFs(root),
            usbInfo.serialNumber,
            device.modelNumber
          );
          // Re-read so the resolved device carries the freshly-set GUID.
          const setupItdb = await Itdb.open(createBrowserFs(root), {
            device: {
              ...device,
              firewireGuid: usbInfo.serialNumber,
              serialNumber: usbInfo.serialNumber,
            },
          });
          try {
            const setupResolved = setupItdb.resolvedDevice;
            if (setupResolved?.firewireGuid) {
              device.firewireGuid = setupResolved.firewireGuid;
              device.serialNumber =
                setupResolved.serialNumber ?? device.serialNumber;
            }
          } finally {
            setupItdb[Symbol.dispose]();
          }
        } catch (err) {
          console.warn("[IpodDetector] One-time SysInfo setup failed:", err);
        }
      }
      // #region Map to sync models
      playlists = itdb.playlists.map((playlist) => {
        return {
          id: playlist.playlistId,
          name: `${playlist.name}${playlist.isMaster ? " (Master)" : ""}`,
          trackIds: playlist.items.map((t) => t.trackId),
        };
      });

      artworks = (itdb.artwork?.getImages() ?? []).map((image) => {
        return {
          id: image.imageId,
          formats: image.thumbnails.map((t) => {
            return {
              formatId: t.formatId,
              width: t.imageWidth,
              height: t.imageHeight,
              fileName: t.filename,
            };
          }),
        };
      });

      tracks = itdb.tracks.map((track) => {
        return {
          id: track.trackId,
          title: track.title,
          album: track.album,
          artist: track.artist,
          durationMs: track.length,
          genre: track.genre,
          year: track.year,
          trackNumber: track.trackNumber,
          trackTotal: track.trackTotal,
          discNumber: track.discNumber,
          discTotal: track.discTotal,
          bitrate: track.bitrate,
          fileSize: track.size,
          path: track.path,
          // Link the track to its cover-art image in the device ArtworkDB.
          // mhiiLink is the ArtworkDB imageId (mhii::song_id) this track's art
          // lives under; 0/absent means the track has no embedded cover art.
          artworkId: track.mhiiLink > 0 ? String(track.mhiiLink) : undefined,
        };
      });
      //#endregion

      // Decode each distinct image once: many tracks share an album's cover,
      // and reading the same .ithmb range per track would multiply the scan
      // cost. The bytes are kept in memory on the track, never persisted.
      const artworkBlobs = new Map<string, Blob>();
      for (const track of tracks) {
        const artworkId = track.artworkId;
        if (!artworkId || artworkBlobs.has(artworkId)) continue;

        try {
          const raw = await itdb.getArtwork(track.id);
          const blob = raw ? await rgbaToPngBlob(raw) : null;
          if (blob) artworkBlobs.set(artworkId, blob);
        } catch (err) {
          // Art is optional: a track without a readable cover still syncs.
          console.warn("[IpodDetector] Could not read cover art:", err);
        }
      }

      for (const track of tracks) {
        const blob = track.artworkId
          ? artworkBlobs.get(track.artworkId)
          : undefined;
        if (blob) track.artwork = blob;
      }
    } finally {
      itdb[Symbol.dispose]();
    }

    const media: SyncLibrary = {
      artworks,
      playlists,
      tracks,
    };

    //#region Storage usage
    // Used space is the real byte total of the volume: a metadata-only walk
    // (getFile() never reads file contents), so this is exact and also counts
    // artwork, photos and anything else taking room, not just music.
    let usedBytes: number | undefined;

    try {
      usedBytes = await getDirectorySize(root);
    } catch (err) {
      console.warn("[IpodDetector] Could not measure used space:", err);
    }

    // Capacity is nominal and decimal (Apple's 1 GB = 1e9 bytes), making it
    // comparable with the byte counts above. `resolved` is the device
    // SysInfo actually reported; `device` is the representative SKU inferred
    // from the USB product ID, which only identifies the generation.
    const capacityGB = resolved?.capacityGB ?? device.capacityGB;

    const storage: SyncDevice["storage"] = {
      usedBytes,
      capacityBytes:
        capacityGB != null && capacityGB > 0 ? capacityGB * 1e9 : undefined,
    };
    //#endregion

    return {
      id: uuidv7(),
      name: root.name,
      productId: usbInfo?.productId,
      type: "iPod",
      media,
      model,
      usb,
      capabilities: {
        database: true,
        artwork: true,
        playlists: true,
        playbackStats: true,
      },
      storage,
      rootHandle: root,
      createdAt: Date.now(),
      connected: true,
    };
  }

  private async tryGetUsbInfo() {
    try {
      const usbDevice = await navigator.usb.requestDevice({
        filters: USB_DEVICE_FILTERS,
      });

      return mapUsbDevice(usbDevice);
    } catch {
      return undefined;
    }
  }
}
