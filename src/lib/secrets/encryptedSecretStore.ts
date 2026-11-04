/**
 * Generic browser secret store for remote music sources.
 *
 * Holds auth material (password/token) keyed by a source id, SEPARATE from
 * the `MusicSource` entity — the entity contract intentionally never carries
 * credentials. Any music source strategy can create a namespaced store.
 *
 * Encryption model (protect at rest, decryptable in-session):
 *  - A random 256-bit AES-GCM master key is generated once per origin and
 *    stored in IndexedDB (a different, non-cookie storage than the
 *    localStorage ciphertext). The key never touches localStorage.
 *  - Each secret is AES-GCM encrypted under that key with a random IV.
 *    localStorage holds only { v, iv, ct }.
 *  - This protects against casual inspection of the localStorage value and
 *    separates key material from ciphertext. It is not a defense against a
 *    full origin compromise (the key is recoverable via the same origin's
 *    IDB) — the OS keychain via Tauri remains the production hardening path.
 */

const KEY_DB_STORE = "keys";
const KEY_DB_NAME = "master";

const IV_BYTES = 12;

/** A stored secret: encrypted envelope (v1) or legacy plaintext (v0). */
type StoredSecret =
  | { v: 1; iv: string; ct: string }
  | { v: 0; plain: string };

type Secrets = Record<string, StoredSecret>;

export interface EncryptedSecretStore {
  setSecret(sourceId: string, secret: string): Promise<void>;
  getSecret(sourceId: string): Promise<string | null>;
  deleteSecret(sourceId: string): Promise<void>;
  clearSecrets(): Promise<void>;
}

// Memoized stores per namespace (avoids re-deriving the key on each call).
const storeCache = new Map<string, EncryptedSecretStore>();

function readSecrets(storageKey: string): Secrets {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Secrets) : {};
  } catch {
    return {};
  }
}

function writeSecrets(storageKey: string, secrets: Secrets): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(secrets));
  } catch {
    // storage-restricted context; best-effort only
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function subtleAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof indexedDB !== "undefined"
  );
}

async function getMasterKey(keyDb: string): Promise<CryptoKey | null> {
  if (!subtleAvailable()) return null;
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest | undefined;
    try {
      req = indexedDB.open(keyDb, 1);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req!.result;
      if (!db.objectStoreNames.contains(KEY_DB_STORE)) {
        db.createObjectStore(KEY_DB_STORE);
      }
    };
    req.onsuccess = () => {
      const db = req!.result;
      try {
        const store = db
          .transaction(KEY_DB_STORE, "readonly")
          .objectStore(KEY_DB_STORE);
        const get = store.get(KEY_DB_NAME);
        get.onsuccess = () => {
          const existing = get.result as CryptoKey | undefined;
          if (existing) {
            resolve(existing);
            return;
          }
          const key = crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
          );
          key.then((k) => {
            const tx = db.transaction(KEY_DB_STORE, "readwrite");
            tx.objectStore(KEY_DB_STORE).put(k, KEY_DB_NAME);
            tx.oncomplete = () => resolve(k);
            tx.onerror = () => resolve(k);
          });
        };
        get.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

async function encryptSecret(
  masterKey: CryptoKey,
  secret: string
): Promise<StoredSecret> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ivBuf = iv.buffer.slice(
    iv.byteOffset,
    iv.byteOffset + iv.byteLength
  ) as ArrayBuffer;
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBuf },
    masterKey,
    new TextEncoder().encode(secret)
  );
  return { v: 1, iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
}

async function decryptSecret(
  masterKey: CryptoKey,
  s: StoredSecret
): Promise<string> {
  if (s.v === 0) return s.plain;
  const ivBytes = base64ToBytes(s.iv);
  const ivBuf = ivBytes.buffer.slice(
    ivBytes.byteOffset,
    ivBytes.byteOffset + ivBytes.byteLength
  ) as ArrayBuffer;
  const ctBytes = base64ToBytes(s.ct);
  const ctBuf = ctBytes.buffer.slice(
    ctBytes.byteOffset,
    ctBytes.byteOffset + ctBytes.byteLength
  ) as ArrayBuffer;
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuf },
    masterKey,
    ctBuf
  );
  return new TextDecoder().decode(plain);
}

/**
 * Create a namespaced encrypted secret store. Each namespace gets its own
 * storage key + IndexedDB master key, so different source kinds (or servers)
 * never share key/ciphertext material unintentionally.
 */
export function createEncryptedSecretStore(
  namespace: string
): EncryptedSecretStore {
  const cached = storeCache.get(namespace);
  if (cached) return cached;

  const storageKey = `wmm.secrets.${namespace}`;
  const keyDb = `wmm.secrets.${namespace}.keydb`;

  const store: EncryptedSecretStore = {
    async setSecret(sourceId, secret) {
      const key = await getMasterKey(keyDb);
      if (!key) {
        // No WebCrypto/IDB — fall back to labeled plaintext so auth still
        // works in restricted contexts (clearly marked, best-effort).
        writeSecrets(storageKey, {
          ...readSecrets(storageKey),
          [sourceId]: { v: 0, plain: secret },
        });
        return;
      }
      const secrets = readSecrets(storageKey);
      secrets[sourceId] = await encryptSecret(key, secret);
      writeSecrets(storageKey, secrets);
    },

    async getSecret(sourceId) {
      const entry = readSecrets(storageKey)[sourceId];
      if (!entry) return null;
      try {
        const key = await getMasterKey(keyDb);
        return key ? await decryptSecret(key, entry) : entry.v === 0 ? entry.plain : null;
      } catch {
        return null;
      }
    },

    async deleteSecret(sourceId) {
      const secrets = readSecrets(storageKey);
      delete secrets[sourceId];
      writeSecrets(storageKey, secrets);
    },

    async clearSecrets() {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // nothing persisted
      }
      try {
        indexedDB.deleteDatabase(keyDb);
      } catch {
        // no IndexedDB / already gone
      }
    },
  };

  storeCache.set(namespace, store);
  return store;
}