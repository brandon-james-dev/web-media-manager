import { type SysInfo, parseSysInfo } from "../itunesdb/parsers";
import type { IpodDeviceInfo } from "../models";

export async function readDeviceInfo(
  root: FileSystemDirectoryHandle
): Promise<IpodDeviceInfo> {
  const control = await root.getDirectoryHandle("iPod_Control");

  const device = await control.getDirectoryHandle("Device");

  let sysInfo: SysInfo | undefined;
  let sysInfoExtendedText: string | undefined;

  try {
    const handle = await device.getFileHandle("SysInfo");

    const text = await (await handle.getFile()).text();

    sysInfo = parseSysInfo(text);
  } catch {}

  try {
    const handle = await device.getFileHandle("SysInfoExtended");

    sysInfoExtendedText = await (await handle.getFile()).text();
  } catch {}

  return {
    sysInfo,
    sysInfoExtendedText,
  };
}
