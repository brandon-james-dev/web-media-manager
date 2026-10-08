import type { UsbDeviceInfo } from "../usb";
import type { DeviceDetector } from "./DeviceDetector";
import type { SyncDevice } from "@/models";

export class MtpDetector implements DeviceDetector {
  async detect(
    usb?: UsbDeviceInfo,
    root?: FileSystemDirectoryHandle
  ): Promise<SyncDevice> {
    if (!usb && !root)
      throw new Error("Nothing is available to discover this device");
    if (!root) throw new Error("The device's root directory was not found");
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
      throw new Error("The device is not an MTP device");
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
