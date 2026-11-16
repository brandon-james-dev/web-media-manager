import type { SyncDevice } from "@/models";

/**
 * Serialise the two writers of the device list.
 *
 * `SyncProvider` writes `devices` from two places: `refreshDevices` replaces
 * the whole list with a fresh scan, and `addDevice` appends the device the user
 * just picked. A refresh started before the add resolves after it and replaces
 * the list with the pre-add snapshot, so the row the user just added vanishes —
 * the device looked like it was never added, and only reappeared on the next
 * scan (after an unplug/replug).
 *
 * Every explicit mutation bumps a revision. A refresh only applies its result
 * when no mutation happened while it was in flight; otherwise the newer state
 * wins and the stale snapshot is dropped.
 */
export interface DeviceListSync {
  /** Record that the list was changed outside a refresh. */
  markMutation(): void;
  /**
   * Load and apply a fresh device list.
   *
   * @returns `true` when the result was applied, `false` when it was discarded
   * because a mutation landed while the load was in flight.
   */
  refresh(load: () => Promise<SyncDevice[]>): Promise<boolean>;
}

export function createDeviceListSync(
  apply: (devices: SyncDevice[]) => void
): DeviceListSync {
  let revision = 0;

  return {
    markMutation() {
      revision += 1;
    },

    async refresh(load) {
      const startedAt = revision;
      const next = await load();

      // A device was added or unplugged while this scan ran. Applying the
      // older snapshot would discard that change.
      if (revision !== startedAt) return false;

      apply(next);
      return true;
    },
  };
}
