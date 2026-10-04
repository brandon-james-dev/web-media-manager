import type { SyncDevice } from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { getDirectorySize, hasDirectory } from "../helpers";
import {
  IPOD_MODELS_BY_MODEL_NUMBER,
  parseITunesDb,
  readDeviceInfo,
} from "../ipod";
import { uuidv7 } from "uuidv7";

export class IpodDetector implements DeviceDetector {
  async detect(
    root: FileSystemDirectoryHandle
  ): Promise<SyncDevice | undefined> {
    const hasControl = await hasDirectory(root, "iPod_Control");

    if (!hasControl) {
      return undefined;
    }

    const deviceInfo = await readDeviceInfo(root);
    if (!deviceInfo.sysInfo) return undefined;

    const db = await parseITunesDb(root);

    const usedBytes = await getDirectorySize(root);

    return {
      id: uuidv7(),
      name: root.name,
      type: "iPod",
      model: deviceInfo.sysInfo?.modelNumber
        ? IPOD_MODELS_BY_MODEL_NUMBER[deviceInfo.sysInfo?.modelNumber].name
        : "Unknown iPod",
      serialNumber: deviceInfo.sysInfo?.serialNumber,
      firmwareVersion: deviceInfo.sysInfo?.firmwareVersion,
      sysInfo: deviceInfo.sysInfo,
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
