import { parseSysInfo, type SysInfo } from "../itunesdb/parsers";

async function readSysInfo(root: FileSystemDirectoryHandle): Promise<SysInfo> {
  const control = await root.getDirectoryHandle("iPod_Control");
  const device = await control.getDirectoryHandle("Device");
  const file = await device.getFileHandle("SysInfo");
  const text = await (await file.getFile()).text();

  return parseSysInfo(text);
}

export { readSysInfo };
