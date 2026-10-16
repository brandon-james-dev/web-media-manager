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
import { mapUsbDevice, type UsbDeviceInfo } from "../usb";

export class IpodDetector implements DeviceDetector {
  async detect(
    root?: FileSystemDirectoryHandle,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice> {
    if (!root) throw new Error("The root directory was not found");
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

    using itdb = await Itdb.open(createBrowserFs(root), {
      device,
    });
    // Carry the on-device GUID/serial onto the resolved device so the
    // hash58 checksum works on devices that need it (nano 3/4G, classic).
    const resolved = itdb.resolvedDevice;
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
        await writeSysInfo(createBrowserFs(root), usbInfo.serialNumber, device.modelNumber);
        // Re-read so the resolved device carries the freshly-set GUID.
        using setupItdb = await Itdb.open(createBrowserFs(root), {
          device: { ...device, firewireGuid: usbInfo.serialNumber, serialNumber: usbInfo.serialNumber },
        });
        const setupResolved = setupItdb.resolvedDevice;
        if (setupResolved?.firewireGuid) {
          device.firewireGuid = setupResolved.firewireGuid;
          device.serialNumber = setupResolved.serialNumber ?? device.serialNumber;
        }
      } catch (err) {
        console.warn("[IpodDetector] One-time SysInfo setup failed:", err);
      }
    }

    // #region Map to sync models
    const playlists: SyncPlaylist[] = itdb.playlists.map((playlist) => {
      return {
        id: playlist.playlistId,
        name: `${playlist.name}${playlist.isMaster ? " (Master)" : ""}`,
        trackIds: playlist.items.map((t) => t.trackId),
      };
    });

    const artworks: SyncArtwork[] = (itdb.artwork?.getImages() ?? []).map(
      (image) => {
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
      }
    );

    const tracks: SyncTrack[] = itdb.tracks.map((track) => {
      return {
        id: track.trackId,
        title: track.title,
        album: track.album,
        artist: track.artist,
        durationMs: track.length,
        // Link the track to its cover-art image in the device ArtworkDB.
        // mhiiLink is the ArtworkDB imageId (mhii::song_id) this track's art
        // lives under; 0/absent means the track has no embedded cover art.
        artworkId: track.mhiiLink > 0 ? String(track.mhiiLink) : undefined,
      };
    });

    const media: SyncLibrary = {
      artworks,
      playlists,
      tracks,
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
      rootHandle: root,
      createdAt: Date.now(),
      connected: true,
    };
  }

  private async tryGetUsbInfo() {
    try {
      const usbDevice = await navigator.usb.requestDevice({
        filters: [
          { classCode: 0x06 }, // MTP/PTP
          { classCode: 0x08 }, // Mass Storage
        ],
      });

      return mapUsbDevice(usbDevice);
    } catch {
      return undefined;
    }
  }
}
