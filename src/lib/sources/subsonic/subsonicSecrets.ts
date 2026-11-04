/**
 * Subsonic-specific secret store — a thin adapter over the generic
 * encrypted secret store (lib/secrets), namespaced to "subsonic" so the
 * auth material is keyed/encrypted distinctly from other source kinds.
 */
import { createEncryptedSecretStore } from "@/lib/secrets/encryptedSecretStore";

const subsonicSecrets = createEncryptedSecretStore("subsonic");

/** Store the password for a subsonic source id (encrypted at rest). */
export async function setSubsonicSecret(
  sourceId: string,
  password: string
): Promise<void> {
  await subsonicSecrets.setSecret(sourceId, password);
}

/** Retrieve the password for a source id, or null when unset. */
export async function getSubsonicSecret(
  sourceId: string
): Promise<string | null> {
  return await subsonicSecrets.getSecret(sourceId);
}

/** Remove the stored password for a source id. */
export async function deleteSubsonicSecret(sourceId: string): Promise<void> {
  await subsonicSecrets.deleteSecret(sourceId);
}

/**
 * Clear ALL stored subsonic connection secrets (passwords) and the master
 * wrapping key. Used by the destructive "Clear Song Database" flow — the
 * stored credentials are source-adjacent and must go when the library is
 * wiped, even though they live in localStorage/IndexedDB rather than Dexie.
 */
export async function clearSubsonicSecrets(): Promise<void> {
  await subsonicSecrets.clearSecrets();
}
