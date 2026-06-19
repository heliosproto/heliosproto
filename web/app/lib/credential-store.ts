import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "helios-wallet";
const DB_VERSION = 1;
const STORE_NAME = "credentials";
const CREDENTIAL_KEY = "passkey-credential";

interface StoredCredential {
  credentialId: Uint8Array;
  publicKey: Uint8Array;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function storeCredential(
  credentialId: Uint8Array,
  publicKey: Uint8Array,
): Promise<void> {
  const db = await getDB();
  const credential: StoredCredential = {
    credentialId,
    publicKey,
    createdAt: Date.now(),
  };
  await db.put(STORE_NAME, credential, CREDENTIAL_KEY);
}

export async function loadCredential(): Promise<StoredCredential | null> {
  try {
    const db = await getDB();
    const credential = await db.get(STORE_NAME, CREDENTIAL_KEY);
    return credential ?? null;
  } catch {
    return null;
  }
}

export async function hasCredential(): Promise<boolean> {
  const credential = await loadCredential();
  return credential !== null;
}

export async function clearCredential(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, CREDENTIAL_KEY);
}

export type { StoredCredential };
