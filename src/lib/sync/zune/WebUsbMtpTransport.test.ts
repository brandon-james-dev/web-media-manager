import { describe, expect, it, vi } from "vitest";
import { WebUsbMtpTransport } from "./WebUsbMtpTransport";

/**
 * Two scans of the same physical device must share one lease.
 *
 * `navigator.usb.getDevices()` returns a different `USBDevice` instance than
 * the picker held, so an identity-keyed `WeakMap` gave each scan its own lease.
 * Both then called `open()` on the same hardware: WebUSB rejected the second
 * with `InvalidStateError`, or it waited out the full 15 s lease timeout and
 * failed. The device stayed "syncing" and never finished being added.
 */

interface Shared {
  busy: boolean;
}

function makeUsbDevice(shared: Shared, serialNumber = "SN-ZUNE-120") {
  return {
    vendorId: 0x045e,
    productId: 0x0710,
    serialNumber,
    opened: false,
    configuration: {
      configurationValue: 1,
      interfaces: [
        {
          interfaceNumber: 0,
          claimed: false,
          alternate: {
            interfaceClass: 0x06,
            endpoints: [
              { type: "bulk", direction: "out", endpointNumber: 1 },
              { type: "bulk", direction: "in", endpointNumber: 2 },
            ],
          },
        },
      ],
    },
    configurations: [{ configurationValue: 1 }],
    async open() {
      if (shared.busy) {
        throw new DOMException(
          "An operation that changes the device state is in progress.",
          "InvalidStateError"
        );
      }
      shared.busy = true;
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.opened = true;
    },
    async selectConfiguration() {},
    async claimInterface() {},
    async releaseInterface() {},
    async close() {
      shared.busy = false;
      this.opened = false;
    },
  };
}

/**
 * A device whose interface claim can be made to fail, to exercise the
 * failed-open cleanup path.
 */
function makeReopenableDevice(state: {
  opened: boolean;
  claimed: boolean;
  failClaim: boolean;
}) {
  const iface = {
    interfaceNumber: 0,
    get claimed() {
      return state.claimed;
    },
    alternate: {
      interfaceClass: 0x06,
      endpoints: [
        { type: "bulk", direction: "out", endpointNumber: 1 },
        { type: "bulk", direction: "in", endpointNumber: 2 },
      ],
    },
  };

  return {
    vendorId: 0x045e,
    productId: 0x0710,
    serialNumber: "SN-REOPEN",
    get opened() {
      return state.opened;
    },
    configuration: null as null | {
      configurationValue: number;
      interfaces: unknown[];
    },
    configurations: [{ configurationValue: 1 }],
    async open() {
      state.opened = true;
    },
    async selectConfiguration(value: number) {
      if (!state.opened) {
        throw new DOMException(
          "Unable to set device configuration.",
          "NetworkError"
        );
      }
      this.configuration = { configurationValue: value, interfaces: [iface] };
    },
    async claimInterface() {
      if (state.failClaim) {
        throw new DOMException("claim failed", "NetworkError");
      }
      state.claimed = true;
    },
    async releaseInterface() {
      state.claimed = false;
    },
    async close() {
      state.opened = false;
      state.claimed = false;
      this.configuration = null;
    },
    interfaces: [iface],
  };
}

describe("WebUsbMtpTransport device lease", () => {  it("serialises two transports for the same physical device", async () => {
    const shared: Shared = { busy: false };
    // Two distinct instances, as the picker and getDevices() hand back.
    const first = new WebUsbMtpTransport(
      makeUsbDevice(shared) as unknown as USBDevice
    );
    const second = new WebUsbMtpTransport(
      makeUsbDevice(shared) as unknown as USBDevice
    );

    await first.open();
    const opening = second.open();
    await first.close();

    await expect(opening).resolves.toBeUndefined();
    await second.close();
  });

  it("does not serialise two different devices", async () => {
    // Separate hardware, so separate busy flags.
    const first = new WebUsbMtpTransport(
      makeUsbDevice({ busy: false }, "SN-A") as unknown as USBDevice
    );
    const second = new WebUsbMtpTransport(
      makeUsbDevice({ busy: false }, "SN-B") as unknown as USBDevice
    );

    // Different serials are different players, so neither waits for the other.
    await expect(
      Promise.all([first.open(), second.open()])
    ).resolves.toHaveLength(2);

    await first.close();
    await second.close();
  });

  it("closes the device when open fails, so the next attempt starts clean", async () => {
    const state = { opened: false, claimed: false, failClaim: true };
    const device = makeReopenableDevice(state);

    const first = new WebUsbMtpTransport(device as unknown as USBDevice);
    await expect(first.open()).rejects.toBeTruthy();

    // Releasing only the lease left the device open, so the next attempt
    // skipped `device.open()` and drove a stale handle — WebUSB answered
    // `NetworkError: Unable to set device configuration`.
    expect(state.opened).toBe(false);

    state.failClaim = false;
    const second = new WebUsbMtpTransport(device as unknown as USBDevice);
    await expect(second.open()).resolves.toBeUndefined();
    await second.close();
  });
});

/**
 * A transfer still in flight makes WebUSB reject `releaseInterface` and
 * `close` with `InvalidStateError`. Swallowing those errors left the interface
 * claimed after a timed-out session, so every later add failed with
 * `could not open interface for exclusive access (0xe00002c5)` until the device
 * was physically unplugged.
 */
describe("WebUsbMtpTransport release after a stalled transfer", () => {
  function makeStallingDevice(state: {
    releaseAttempts: number;
    releases: number;
    closes: number;
    closeFails?: boolean;
  }) {
    return {
      vendorId: 0x045e,
      productId: 0x0710,
      serialNumber: "SN-STALL",
      opened: false,
      configuration: {
        configurationValue: 1,
        interfaces: [
          {
            interfaceNumber: 0,
            claimed: false,
            alternate: {
              interfaceClass: 0x06,
              endpoints: [
                { type: "bulk", direction: "out", endpointNumber: 1 },
                { type: "bulk", direction: "in", endpointNumber: 2 },
              ],
            },
          },
        ],
      },
      configurations: [{ configurationValue: 1 }],
      async open() {
        this.opened = true;
      },
      async selectConfiguration() {},
      async claimInterface() {},
      async releaseInterface() {
        state.releases += 1;
        if (state.releases <= state.releaseAttempts) {
          throw new DOMException(
            "An operation that changes the device state is in progress.",
            "InvalidStateError"
          );
        }
      },
      async close() {
        state.closes += 1;
        if (state.closeFails) {
          throw new DOMException(
            "An operation that changes the device state is in progress.",
            "InvalidStateError"
          );
        }
        this.opened = false;
      },
    };
  }

  it("retries until the interface is actually released", async () => {
    const state = { releaseAttempts: 3, releases: 0, closes: 0 };
    const device = makeStallingDevice(state);

    const transport = new WebUsbMtpTransport(device as unknown as USBDevice);
    await transport.open();
    await transport.close();

    // Three rejections, then the fourth attempt succeeds.
    expect(state.releases).toBe(4);
    expect(state.closes).toBe(1);
  });

  it("reports when the device never releases", async () => {
    const state = {
      releaseAttempts: 99,
      releases: 0,
      closes: 0,
      closeFails: true,
    };
    const device = makeStallingDevice(state);
    const transport = new WebUsbMtpTransport(device as unknown as USBDevice);
    await transport.open();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await transport.close();
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0]?.[0])).toContain("could not release");
    } finally {
      warn.mockRestore();
    }
  });
});

/**
 * `MtpProtocol.resynchronise()` falls back to `clearHalt` after a timed-out
 * transaction, and the method is optional on the transport type. The app
 * transport did not implement it, so a stalled bulk endpoint stayed halted and
 * every later transfer failed: the session could only be recovered by
 * unplugging the device. The package's `UsbTransport` does implement it, which
 * is why the same protocol recovered there and not in the browser.
 */
describe("WebUsbMtpTransport clearHalt", () => {
  function makeDevice(calls: Array<{ endpoint: number; direction: string }>) {
    return {
      vendorId: 0x045e,
      productId: 0x0710,
      serialNumber: "SN-HALT",
      opened: false,
      configuration: {
        configurationValue: 1,
        interfaces: [
          {
            interfaceNumber: 0,
            claimed: false,
            alternate: {
              interfaceClass: 0x06,
              endpoints: [
                { type: "bulk", direction: "out", endpointNumber: 1 },
                { type: "bulk", direction: "in", endpointNumber: 2 },
              ],
            },
          },
        ],
      },
      configurations: [{ configurationValue: 1 }],
      async open() {
        this.opened = true;
      },
      async selectConfiguration() {},
      async claimInterface() {},
      async releaseInterface() {},
      async close() {
        this.opened = false;
      },
      async clearHalt(endpointNumber: number, direction: string) {
        calls.push({ endpoint: endpointNumber, direction });
      },
    };
  }

  it("clears the endpoint for the requested direction", async () => {
    const calls: Array<{ endpoint: number; direction: string }> = [];
    const device = makeDevice(calls);

    const transport = new WebUsbMtpTransport(device as unknown as USBDevice);
    await transport.open();

    await transport.clearHalt("in");
    await transport.clearHalt("out");

    // WebUSB order: endpoint number first, then direction.
    expect(calls).toEqual([
      { endpoint: 2, direction: "in" },
      { endpoint: 1, direction: "out" },
    ]);
  });

  it("is a no-op before the device is opened", async () => {
    const calls: Array<{ endpoint: number; direction: string }> = [];
    const device = makeDevice(calls);

    const transport = new WebUsbMtpTransport(device as unknown as USBDevice);
    await transport.clearHalt("in");

    expect(calls).toEqual([]);
  });
});

/**
 * A freshly attached device is unconfigured, and reading `configuration` then
 * throws instead of returning null. Testing it directly failed before the
 * device was configured, so a player that had just been plugged in could not be
 * opened at all.
 */
describe("WebUsbMtpTransport on an unconfigured device", () => {
  it("selects a configuration instead of failing", async () => {
    const state = { selected: 0, claimed: 0 };
    const device = {
      vendorId: 0x045e,
      productId: 0x0710,
      serialNumber: "SN-UNCONFIGURED",
      opened: false,
      get configuration() {
        if (state.selected === 0) {
          throw new Error("configuration error: device is not configured");
        }
        return {
          configurationValue: state.selected,
          interfaces: [
            {
              interfaceNumber: 0,
              claimed: false,
              alternate: {
                interfaceClass: 0x06,
                endpoints: [
                  { type: "bulk", direction: "out", endpointNumber: 1 },
                  { type: "bulk", direction: "in", endpointNumber: 2 },
                ],
              },
            },
          ],
        };
      },
      configurations: [{ configurationValue: 1 }],
      async open() {
        this.opened = true;
      },
      async selectConfiguration(value: number) {
        state.selected = value;
      },
      async claimInterface() {
        state.claimed += 1;
      },
      async releaseInterface() {},
      async close() {
        this.opened = false;
      },
      async clearHalt() {},
    };

    const transport = new WebUsbMtpTransport(device as unknown as USBDevice);
    await expect(transport.open()).resolves.toBeUndefined();

    expect(state.selected).toBe(1);
    expect(state.claimed).toBe(1);
  });
});
