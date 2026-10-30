export interface SystemPing {
  version: string;
}

export interface SystemScanStatus {
  scanning: boolean;
  count: number | null;
  lastScan: string | null;
}

export const WMM_VERSION = "0.0.0";
