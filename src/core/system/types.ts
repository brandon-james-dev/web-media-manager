export interface SystemPing {
  version: string;
}

export interface SystemScanStatus {
  scanning: boolean;
  count: number | null;
  lastScan: string | null;
}

export const WMM_VERSION = __APP_VERSION__;
export const WMM_BUILD_TIME = __APP_BUILD_TIME__;
export const WMM_COMMIT_HASH = __APP_COMMIT_HASH__;
