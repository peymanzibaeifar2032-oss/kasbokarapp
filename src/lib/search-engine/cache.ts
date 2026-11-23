type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs });
  // simple size guard
  if (store.size > 500) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}
