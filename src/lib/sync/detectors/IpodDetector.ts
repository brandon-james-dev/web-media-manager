import type { SyncDevice, SyncLibrary } from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { hasDirectory } from "../helpers";
import { uuidv7 } from "uuidv7";
import {
  getIpodModel,
  mapIpodLibrary,
  parseArtworkDb,
  parseITunesDb,
} from "@ipod-db";
import { readDeviceInfo } from "@ipod-db/src/readers";

export class IpodDetector implements DeviceDetector {
  async detect(
    root: FileSystemDirectoryHandle
  ): Promise<SyncDevice | undefined> {
    const hasControl = await hasDirectory(root, "iPod_Control");

    if (!hasControl) return undefined;

    const deviceInfo = await readDeviceInfo(root);

    if (!deviceInfo) return undefined;
    if (!deviceInfo.sysInfo) return undefined;
    if (!deviceInfo.sysInfo.modelNumber) return undefined;

    const [dbResult, artworkResult] = await Promise.allSettled([
      parseITunesDb(root),
      parseArtworkDb(root),
    ]);

    const db = dbResult.status === "fulfilled" ? dbResult.value : null;

    const artworkDb =
      artworkResult.status === "fulfilled" ? artworkResult.value : null;

    let media: SyncLibrary = {
      artworks: [],
      playlists: [],
      tracks: [],
    };

    if (db && artworkDb) media = mapIpodLibrary(db, artworkDb);

    const { modelNumber } = deviceInfo.sysInfo;
    const model = getIpodModel(modelNumber)?.name || "Unknown iPod";

    return {
      id: uuidv7(),
      name: root.name,
      type: "iPod",
      model,
      media,
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
}
