import { afterEach, describe, expect, it, vi } from "vitest";
import { findUsbDevice } from "./findUsbDevice";

/**
 * `findUsbDevice` resolves the `USBDevice` behind a `UsbDeviceInfo` that came
 * from the picker. It matched on vendor id and product id only, and 0x0710 is
 * the product id of every classic Zune — so with two players of the same
 * model granted to the origin it returned whichever came first in
 * `getDevices()`, and the add flow then read the other player's serial,
 * capacity and library.
 */

function granted(serialNumber: string, productId = 0x0710) {
  return {
    vendorId: 0x045e,
    productId,
    serialNumber,
    manufacturerName: "Microsoft",
    productName: "Zune",
  } as unknown as USBDevice;
}

function withGrantedDevices(devices: USBDevice[]): void {
  vi.stubGlobal("navigator", {
    usb: { getDevices: async () => devices },
  });
}

const zune8 = {
  vendorId: 0x045e,
  productId: 0x0710,
  serialNumber: "c80291cc-ca81-b58b-82d8-26eeadcc0ce8",
  manufacturerName: "Microsoft",
  productName: "Zune",
};

describe("findUsbDevice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("picks the device with the requested serial, not the first of its model", async () => {
    withGrantedDevices([granted("other-zune"), granted(zune8.serialNumber)]);

    const found = await findUsbDevice(zune8);

    expect(found?.serialNumber).toBe(zune8.serialNumber);
  });

  it("falls back to the model when the serial is unknown", async () => {
    withGrantedDevices([granted("only-zune")]);

    const found = await findUsbDevice({ ...zune8, serialNumber: undefined });

    expect(found?.serialNumber).toBe("only-zune");
  });

  it("returns nothing when the device is not granted", async () => {
    withGrantedDevices([granted("other-zune", 0x063e)]);

    await expect(findUsbDevice(zune8)).resolves.toBeUndefined();
  });
});
