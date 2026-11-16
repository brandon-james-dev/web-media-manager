/**
 * Zune support code: the WebUSB MTP transport the MTPZ session runs over, and
 * the lookup that finds an already-granted device. Kept together so the whole
 * Zune implementation sits in one place, the way the iPod's model tables do.
 */
export * from "./WebUsbMtpTransport";
export * from "./findUsbDevice";
