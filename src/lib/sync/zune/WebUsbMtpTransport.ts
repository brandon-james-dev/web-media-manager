import type { MtpTransport } from "zunesync-ts";

/** How long a transport waits for another holder of the same device. */
const DEVICE_LEASE_TIMEOUT_MS = 15000;

interface DeviceLease {
  tail: Promise<void>;
  waiters: number;
}

/**
 * Leases are keyed by the physical device, not by the `USBDevice` object.
 *
 * `navigator.usb.getDevices()` hands back a different `USBDevice` instance than
 * the picker did, so an identity-keyed `WeakMap` gave two scans of the same
 * player separate leases. Both then called `open()` on the same hardware and
 * WebUSB rejected the second with `InvalidStateError: An operation that changes
 * the device state is in progress` — or, when the first session held the
 * interface, the second waited out the full lease timeout and failed. Either
 * way the device never finished being added.
 */
const leases = new Map<string, DeviceLease>();

/** Stable identity for one physical device across `USBDevice` instances. */
function deviceKey(device: USBDevice): string {
  return [
    device.vendorId ?? 0,
    device.productId ?? 0,
    device.serialNumber ?? "",
  ].join(":");
}

/**
 * Take exclusive use of one device until the returned function is called.
 *
 * WebUSB rejects a state-changing call (`open`, `close`, `claimInterface`)
 * while another one is still in flight, with `InvalidStateError: An operation
 * that changes the device state is in progress`. Two scans of the same device
 * — the persisted-device restore runs them concurrently — each opened their
 * own transport and hit exactly that. Serialising the whole session per
 * device also keeps two MTP sessions from interleaving on the same endpoints.
 */
async function acquireDevice(device: USBDevice): Promise<() => void> {
  const key = deviceKey(device);

  let lease = leases.get(key);
  if (!lease) {
    lease = { tail: Promise.resolve(), waiters: 0 };
    leases.set(key, lease);
  }

  const held = lease;
  held.waiters += 1;

  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previous = held.tail;
  held.tail = previous.then(() => released);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Timed out waiting for the Zune to become available")),
      DEVICE_LEASE_TIMEOUT_MS
    );
  });

  // Drop the lease once nobody holds or waits for it, so the map does not grow
  // for every device ever seen.
  const finish = () => {
    release();
    held.waiters -= 1;
    if (held.waiters === 0 && leases.get(key) === held) leases.delete(key);
  };

  try {
    await Promise.race([previous, timeout]);
  } catch (error) {
    finish();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }

  return finish;
}

/**
 * The MTP byte pipe over WebUSB.
 *
 * The Zune package ships a `UsbTransport` that talks to the `usb` npm package,
 * which is Node-only. In the browser the device is reached through WebUSB
 * instead, so this adapts a `USBDevice` to the two-method transport the
 * protocol needs: one bulk OUT endpoint and one bulk IN endpoint.
 */
export class WebUsbMtpTransport implements MtpTransport {
  private readonly device: USBDevice;
  private interfaceNumber = 0;
  private endpointIn = 0;
  private endpointOut = 0;
  private opened = false;
  private release: (() => void) | undefined;

  constructor(device: USBDevice) {
    this.device = device;
  }

  /** Open the device, claim the MTP interface and locate its bulk endpoints. */
  async open(): Promise<void> {
    if (this.opened) return;

    const release = await acquireDevice(this.device);

    try {
      if (!this.device.opened) {
        await this.device.open();
      }

      // `configuration` is not a safe read on an unconfigured device: node-usb
      // and some WebUSB implementations throw "configuration error: device is
      // not configured" instead of returning null, so testing it directly
      // failed before the device was ever configured and a freshly attached
      // player could not be opened at all.
      let configured = false;
      try {
        configured = this.device.configuration !== null;
      } catch {
        configured = false;
      }
      if (!configured) {
        const value = this.device.configurations[0]?.configurationValue ?? 1;
        await this.device.selectConfiguration(value);
      }

      const iface = this.findInterface();
      if (!iface) {
        throw new Error("The device exposes no MTP interface");
      }

      this.interfaceNumber = iface.interfaceNumber;
      if (!iface.claimed) {
        await this.device.claimInterface(iface.interfaceNumber);
      }

      const endpoints = iface.alternate.endpoints.filter(
        (endpoint) => endpoint.type === "bulk"
      );
      const out = endpoints.find((endpoint) => endpoint.direction === "out");
      const input = endpoints.find((endpoint) => endpoint.direction === "in");

      if (!out || !input) {
        throw new Error("The device exposes no bulk endpoints");
      }

      this.endpointOut = out.endpointNumber;
      this.endpointIn = input.endpointNumber;
      this.release = release;
      this.opened = true;
    } catch (error) {
      // Leave the device as we found it. Releasing only the lease left
      // `device.opened` true and the interface claimed, so the next attempt
      // skipped `device.open()` and drove a stale handle — WebUSB answered
      // `NetworkError: Unable to set device configuration` on
      // selectConfiguration, and the device could not be read again until it
      // was unplugged.
      try {
        if (this.device.opened) await this.device.close();
      } catch {
        // The device may already be gone; nothing to clean up.
      }
      release();
      throw error;
    }
  }

  async bulkWrite(data: Uint8Array): Promise<void> {
    const result = await this.device.transferOut(this.endpointOut, data);
    if (result.status !== "ok") {
      throw new Error(`Bulk write failed: ${result.status}`);
    }
  }

  async bulkRead(length: number): Promise<Uint8Array> {
    const result = await this.device.transferIn(this.endpointIn, length);
    if (result.status !== "ok") {
      throw new Error(`Bulk read failed: ${result.status}`);
    }

    // `result.data` is a DataView that may be a window into a larger buffer.
    // Copying `buffer` alone ignored `byteOffset`/`byteLength`, so a short read
    // returned the whole backing buffer and every MTP container was misparsed.
    const view = result.data;
    return new Uint8Array(
      view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
    );
  }

  /**
   * Clear a stalled bulk endpoint.
   *
   * `MtpProtocol.resynchronise()` falls back to this after a timed-out
   * transaction, and `clearHalt` is optional on the transport type. Without it
   * the stalled endpoint stayed halted and every later transfer failed, so the
   * session could only be recovered by unplugging the device — the package's
   * `UsbTransport` implements this, which is why the same protocol recovered
   * there and not in the browser.
   */
  async clearHalt(direction: "in" | "out"): Promise<void> {
    if (!this.opened) return;

    const endpoint = direction === "in" ? this.endpointIn : this.endpointOut;
    try {
      await this.device.clearHalt(endpoint, direction);
    } catch {      // Best effort only: a device that refuses the request is handled by the
      // reopen path in `recover()`.
    }
  }

  async close(): Promise<void> {
    const release = this.release;
    this.release = undefined;

    try {
      if (this.opened) await this.releaseDevice();
    } finally {
      this.opened = false;
      release?.();
    }
  }

  /**
   * Release the interface and close the device, retrying briefly.
   *
   * A bulk transfer that is still in flight makes WebUSB reject both
   * `releaseInterface` and `close` with `InvalidStateError: An operation that
   * changes the device state is in progress`. Those errors used to be swallowed
   * unconditionally, so the interface stayed claimed after a timed-out session
   * and every later add failed with `could not open interface for exclusive
   * access (0xe00002c5)` until the device was physically unplugged — which is
   * why only a disconnect made it detectable again.
   *
   * The pending transfer settles on its own shortly after the timeout, so a
   * short bounded retry is enough. If it still will not release, that is
   * reported rather than hidden.
   */
  private async releaseDevice(): Promise<void> {
    const attempts = 6;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await this.device.close();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    console.warn(
      "[WebUsbMtpTransport] could not release the device; it may stay claimed " +
        "until it is unplugged:",
      lastError
    );
  }

  /**
   * A still-image class request on the claimed interface.
   *
   * PTP-over-USB cancellation needs Cancel Request (0x64) and Get Device Status
   * (0x67); without them a timed-out transaction cannot be cancelled and the
   * device wedges until it is unplugged.
   */
  async classRequest(
    requestType: number,
    request: number,
    data: Uint8Array,
    length: number,
    _timeoutMs: number,
  ): Promise<number> {
    if (!this.opened) throw new Error("USB transport is not open");

    const setup: USBControlTransferParameters = {
      requestType: "class",
      recipient: "interface",
      request,
      value: 0,
      index: this.interfaceNumber,
    };

    if (requestType === 0x21) {
      const result = await this.device.controlTransferOut(setup, data);
      return result.status === "ok"
        ? (result.bytesWritten ?? data.length)
        : -1;
    }

    const result = await this.device.controlTransferIn(setup, length);
    if (result.status !== "ok" || !result.data) return -1;
    const view = result.data;
    const bytes = new Uint8Array(
      view.buffer,
      view.byteOffset,
      Math.min(view.byteLength, length),
    );
    data.set(bytes.subarray(0, Math.min(bytes.length, data.length)));
    return bytes.length;
  }

  /**
   * Close and reopen the device, cancelling any in-flight transfer.
   *
   * A timed-out `transferIn` stays in flight and blocks every later transfer,
   * so clearing the halt does not recover the session. Closing and reopening
   * does — the same thing a physical unplug achieves.
   */
  async recover(): Promise<void> {
    await this.close();
    await this.open();
  }

  /**
   * The MTP interface: class 6 (still image / PTP) or 0xff (vendor-specific),
   * which is what a Zune reports. Falls back to the first interface with bulk
   * endpoints so a device that reports neither still works.
   */
  private findInterface(): USBInterface | undefined {
    const interfaces = this.device.configuration?.interfaces ?? [];

    const mtp = interfaces.find(
      (iface) =>
        iface.alternate.interfaceClass === 0x06 ||
        iface.alternate.interfaceClass === 0xff
    );
    if (mtp) return mtp;

    return interfaces.find((iface) =>
      iface.alternate.endpoints.some((endpoint) => endpoint.type === "bulk")
    );
  }
}
