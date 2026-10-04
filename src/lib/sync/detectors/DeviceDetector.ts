import type { SyncDevice } from "@/models";

export interface DeviceDetector {
  detect(root: FileSystemDirectoryHandle): Promise<SyncDevice | undefined>;
}
