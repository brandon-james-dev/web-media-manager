import type { DeviceDetector } from "./DeviceDetector";
import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "../usb";

export class MtpDetector implements DeviceDetector {
  async detect(
    root: FileSystemDirectoryHandle,
    _usb?: UsbDeviceInfo
  ): Promise<SyncDevice | undefined> {
    const entries: string[] = [];

    for await (const [name] of root.entries()) {
      entries.push(name.toLowerCase());
    }

    const mtpIndicators = [
      "android",
      "dcim",
      "pictures",
      "movies",
      "music",
      "downloads",
      "documents",
    ];

    const matches = mtpIndicators.filter((i) =>
      entries.includes(i.toLowerCase())
    );

    if (matches.length < 3) {
      return undefined;
    }

    return {
      id: root.name,
      name: root.name,
      type: "mtp",

      connected: true,

      media: {
        tracks: [],
        playlists: [],
        artworks: [],
      },

      capabilities: {
        database: false,
        artwork: false,
        playlists: false,
        playbackStats: false,
      },

      storage: {},
      createdAt: Date.now(),
    };
  }
}
