interface SysInfo {
  modelNumber?: string;
  serialNumber?: string;
  firmwareVersion?: string;

  values: Record<string, string>;
}

function parseSysInfo(content: string): SysInfo {
  const values: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    values[key] = value;
  }

  return {
    modelNumber: values.ModelNumStr,
    serialNumber: values.SerialNumber,
    firmwareVersion: values.visibleBuildID,
    values,
  };
}

export { type SysInfo, parseSysInfo };
