/**
 * Browser secret store for remote music sources.
 *
 * Holds the auth material (password/token) for a Subsonic source keyed by
 * source id, SEPARATE from the `MusicSource` entity — the entity contract
 * intentionally never carries credentials.
 *
 * Encryption model (protect at rest, decryptable in-session):
 *  - A random 256-bit AES-GCM master key is generated once per origin and
 *    stored in IndexedDB (a different, non-cookie storage than the
 *    localStorage ciphertext). The key never touches localStorage.
 *  - Each password is AES-GCM encrypted under that key with a random IV.
 *    localStorage holds only { v, iv, ct }.
 *  - This protects against casual inspection of the localStorage value and
 *    separates key material from ciphertext. It is not a defense against a
 *    full origin compromise (the key is recoverable via the same origin's
 *    IDB) — the OS keychain via Tauri remains the production hardening path.
 */

const STORAGE_KEY = "wmm.subsonic.secrets";
const KEY_DB = "wmm.subsonic.keydb";
const KEY_DB_STORE = "keys";
const KEY_DB_NAME = "master";

const IV_BYTES = 12;

/** A stored secret: encrypted envelope (v1) or legacy plaintext (v0). */
type StoredSecret =
  | { v: 1; iv: string; ct: string }
  | { v: 0; plain: string };

type Secrets = Record<string, StoredSecret>;

function readSecrets(): Secrets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Secrets) : {};
  } catch {
    return {};
  }
}

function writeSecrets(secrets: Secrets): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
  } catch {
    // Storage write failed (private mode / quota / blocked site data) —
    // fail open: the in-memory `secrets` is still current for this session.
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function subtleAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

/**
 * Open the IndexedDB-held master-key store, generating a random AES-GCM key
 * on first use. The key lives only in IDB, never alongside the ciphertext.
 */
async function getMasterKey(): Promise<CryptoKey | null> {
  if (!subtleAvailable()) return null;
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(KEY_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(KEY_DB_STORE)) {
          req.result.createObjectStore(KEY_DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction(KEY_DB_STORE, "readwrite");
    const store = tx.objectStore(KEY_DB_STORE);
    const existing = await new Promise<CryptoKey | undefined>((resolve) => {
      const get = store.get(KEY_DB_NAME);
      get.onsuccess = () => resolve(get.result as CryptoKey | undefined);
      get.onerror = () => resolve(undefined);
    });

    if (existing) return existing;

    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false, // not extractable — the raw key can't be pulled from IDB
      ["encrypt", "decrypt"]
    );

    await new Promise<void>((resolve) => {
      store.put(key, KEY_DB_NAME).onsuccess = () => resolve();
    });
    return key;
  } catch {
    return null; // IDB unavailable (private mode) — caller falls back
  }
}

/** Encrypt a password into a stored envelope under the origin master key. */
async function encryptSecret(password: string): Promise<StoredSecret> {
  const key = await getMasterKey();
  if (!key) return { v: 0, plain: password };
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password)
  );
  return { v: 1, iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
}

/** Decrypt a stored envelope back to the plaintext password. */
async function decryptSecret(s: StoredSecret): Promise<string> {
  if (s.v === 0) return s.plain;
  const key = await getMasterKey();
  if (!key) throw new Error("master key unavailable");
  const iv = base64ToBytes(s.iv) as BufferSource;
  const ct = base64ToBytes(s.ct) as BufferSource;
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** Store the password for a source id (encrypted at rest when possible). */
export async function setSubsonicSecret(
  sourceId: string,
  password: string
): Promise<void> {
  const secrets = readSecrets();
  secrets[sourceId] = await encryptSecret(password);
  writeSecrets(secrets);
}

/** Retrieve the password for a source id, or null when unset. */
export async function getSubsonicSecret(
  sourceId: string
): Promise<string | null> {
  const entry = readSecrets()[sourceId];
  if (!entry) return null;
  try {
    return await decryptSecret(entry);
  } catch {
    return null;
  }
}

/** Remove the stored password for a source id. */
export async function deleteSubsonicSecret(sourceId: string): Promise<void> {
  const secrets = readSecrets();
  delete secrets[sourceId];
  writeSecrets(secrets);
}

/**
 * Clear ALL stored subsonic connection secrets (passwords) and the master
 * wrapping key. Used by the destructive "Clear Song Database" flow — the
 * stored credentials are source-adjacent and must go when the library is
 * wiped, even though they live in localStorage/IndexedDB rather than Dexie.
 */
export async function clearSubsonicSecrets(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage-restricted context; nothing persisted
  }
  try {
    const db = indexedDB.open(KEY_DB);
    db.onsuccess = () => {
      db.result.close();
      indexedDB.deleteDatabase(KEY_DB);
    };
  } catch {
    // no IndexedDB / already gone
  }
}
