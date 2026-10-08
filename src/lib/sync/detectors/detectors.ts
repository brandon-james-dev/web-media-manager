import type { DeviceDetector } from "./DeviceDetector";
import { IpodDetector } from "./IpodDetector";
import { MtpDetector } from "./MtpDetector";

export const detectors: DeviceDetector[] = [
  new IpodDetector(),
  new MtpDetector(),
];
