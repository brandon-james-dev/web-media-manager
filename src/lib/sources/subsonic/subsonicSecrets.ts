/**
 * Browser secret store for remote music sources.
 *
 * Holds the auth material (password/token) for a Subsonic source keyed by
 * source id, SEPARATE from the `MusicSource` entity — the entity contract
 * intentionally never carries credentials. localStorage keeps the password
 * across reloads in the browser binding; a server binding would use a real
 * secret store (env/OS keychain).
 *
 * Note: localStorage is not a secure secret store. This is the pragmatic
 * browser binding for a self-hosted music server credential; a stronger
 * store (CryptoKey wrapped, or the OS keychain via Tauri) is the
 * production hardening path.
 */

const STORAGE_KEY = "wmm.subsonic.secrets";

type Secrets = Record<string, string>;

function readSecrets(): Secrets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Secrets) : {};
  } catch {
    return {};
  }
}

function writeSecrets(secrets: Secrets): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
}

/** Store the password for a source id. */
export function setSubsonicSecret(sourceId: string, password: string): void {
  const secrets = readSecrets();
  secrets[sourceId] = password;
  writeSecrets(secrets);
}

/** Retrieve the password for a source id, or null when unset. */
export function getSubsonicSecret(sourceId: string): string | null {
  return readSecrets()[sourceId] ?? null;
}

/** Remove the stored password for a source id. */
export function deleteSubsonicSecret(sourceId: string): void {
  const secrets = readSecrets();
  delete secrets[sourceId];
  writeSecrets(secrets);
}
