export interface SysInfo {
  modelNumber?: string;
  serialNumber?: string;
  firmwareVersion?: string;

  values: Record<string, string>;
}
