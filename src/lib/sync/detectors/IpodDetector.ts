import type { SyncDevice } from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { getDirectorySize, hasDirectory } from "../helpers";
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

    if (!hasControl) {
      return undefined;
    }

    const deviceInfo = await readDeviceInfo(root);

    if (!deviceInfo) return undefined;
    if (!deviceInfo.sysInfo) return undefined;
    if (!deviceInfo.sysInfo.modelNumber) return undefined;

    const db = await parseITunesDb(root);
    const artworkDb = await parseArtworkDb(root);
    const media = mapIpodLibrary(db, artworkDb);
    const usedBytes = await getDirectorySize(root);
    const { modelNumber } = deviceInfo.sysInfo;

    return {
      id: uuidv7(),
      name: root.name,
      type: "iPod",
      model: getIpodModel(modelNumber)?.name || "Unknown iPod",
      serialNumber: deviceInfo.sysInfo?.serialNumber,
      firmwareVersion: deviceInfo.sysInfo?.firmwareVersion,
      sysInfo: deviceInfo.sysInfo,
      media,
      capabilities: {
        database: true,
        artwork: true,
        playlists: true,
        playbackStats: true,
      },
      storage: {
        usedBytes,
      },
      rootHandle: root,
      connected: true,
    };
  }
}
