import type { DeviceDetector } from "./DeviceDetector";
import { IpodDetector } from "./IpodDetector";

export const detectors: DeviceDetector[] = [new IpodDetector()];
