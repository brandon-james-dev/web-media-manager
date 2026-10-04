import type { DeviceDetector } from "./DeviceDetector";
import { IpodDetector } from "./IpodDetector";

const detectors: DeviceDetector[] = [new IpodDetector()];

export { detectors };
