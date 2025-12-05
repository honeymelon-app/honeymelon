import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'settings.json';
const inTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);

function readLocalStorageValue<T>(key: string): T | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  if (typeof localStorage.getItem !== 'function') return undefined;
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

function writeLocalStorageValue(key: string, value: unknown) {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;
  try {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore localStorage failures in headless envs
  }
}

type StoreAdapter = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let storeInstance: StoreAdapter | null = null;

function createMemoryStore(): StoreAdapter {
  const data = new Map<string, unknown>();

  return {
    async get<T>(key: string) {
      if (data.has(key)) {
        return data.get(key) as T;
      }

      return readLocalStorageValue<T>(key);
    },
    async set(key: string, value: unknown) {
      data.set(key, value);
      writeLocalStorageValue(key, value);
    },
    async save() {
      /* no-op for memory store */
    },
  };
}

export async function getStore() {
  if (inTest) {
    storeInstance = null;
  }

  if (storeInstance) return storeInstance;

  const hasTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (!hasTauri) {
    storeInstance = createMemoryStore();
    return storeInstance;
  }

  try {
    storeInstance = await load(STORE_PATH);
  } catch (err) {
    console.warn('[store] Falling back to in-memory store:', err);
    storeInstance = createMemoryStore();
  }

  return storeInstance;
}

export async function saveState(key: string, value: unknown) {
  if (inTest) {
    writeLocalStorageValue(key, value);
    return;
  }

  try {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
  } catch (err) {
    console.error('[store] Failed to save state:', err);
  }
}

export async function loadState<T>(key: string): Promise<T | null> {
  if (inTest) {
    return readLocalStorageValue<T>(key) ?? null;
  }

  try {
    const store = await getStore();
    return (await store.get<T>(key)) ?? null;
  } catch (err) {
    console.warn('[store] Failed to load state:', err);
    return null;
  }
}
