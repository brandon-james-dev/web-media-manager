import type { SyncDevice } from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { hasDirectory } from "../helpers";
import { readSysInfo } from "../readers";
import { IPOD_MODELS } from "./ipod-models";

export class IpodDetector implements DeviceDetector {
  async detect(
    root: FileSystemDirectoryHandle
  ): Promise<SyncDevice | undefined> {
    const hasControl = await hasDirectory(root, "iPod_Control");

    if (!hasControl) {
      return undefined;
    }

    const sysInfo = await readSysInfo(root);

    return {
      id: crypto.randomUUID(),
      name: root.name,
      type: "iPod",
      model: sysInfo.modelNumber
        ? IPOD_MODELS[sysInfo.modelNumber]
        : "Unknown iPod",
      serialNumber: sysInfo.serialNumber,
      firmwareVersion: sysInfo.firmwareVersion,
      sysInfo,
      capabilities: {
        database: true,
        artwork: true,
        playlists: true,
        playbackStats: true,
      },
      rootHandle: root,
      connected: true,
    };
  }
}
