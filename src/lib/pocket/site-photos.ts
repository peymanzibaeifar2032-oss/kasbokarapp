import { z } from "zod";
import { SITE_PHOTO_KEY } from "./backup.ts";

/**
 * Offline cache of the site's design images (first reference image of each downloaded job).
 * Separate database so the bookings/cash databases and their schema versions stay untouched;
 * a missing or failed cache only hides the image, it never touches appointments.
 */
const DB_NAME = "tattoo-pocket-photos";
const STORE = "photos";
export const SITE_PHOTO_BATCH = 4;
const MAX_ROUNDS = 400;

export type SitePhoto = { id: string; key: string; data: string; savedAt: string };

const imageData = z
  .string()
  .max(1024 * 1024)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);
const replySchema = z.object({
  photos: z
    .array(z.object({ serverId: z.string().max(100), key: z.string().regex(SITE_PHOTO_KEY).min(1), data: imageData }))
    .max(20),
  missing: z.array(z.string().max(100)).max(20).default([]),
  deferred: z.array(z.string().max(100)).max(20).default([]),
});
export type SitePhotoReply = z.infer<typeof replySchema>;

export function parseSitePhotoReply(status: number, data: unknown): SitePhotoReply {
  if (status < 200 || status >= 300) throw new Error(`site-photos ${status}`);
  return replySchema.parse(data);
}

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      let value: T | undefined;
      if (req) req.onsuccess = () => (value = req.result);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getSitePhoto(serverId: string): Promise<SitePhoto | null> {
  return ((await withStore<SitePhoto>("readonly", (s) => s.get(serverId))) as SitePhoto | undefined) ?? null;
}

/** serverId → key of every cached image (no image bytes are read). */
export async function sitePhotoKeys(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const row = cursor.value as SitePhoto;
        out.set(row.id, row.key);
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return out;
}

export async function putSitePhoto(photo: SitePhoto) {
  await withStore("readwrite", (s) => {
    s.put(photo);
  });
}

export type SitePhotoSyncResult = { saved: number; missing: number; failed: boolean; pending: number };

/**
 * Fetch the images the phone does not have yet (or whose site key changed), a few per request.
 * Cached images are never deleted here: an appointment keeps its design offline even if the
 * site later removes it. Stops quietly on the first network/server error (next sync retries).
 */
export async function syncSitePhotos(
  wanted: { serverId: string; photoKey?: string }[],
  fetchBatch: (ids: string[]) => Promise<SitePhotoReply>,
  onSaved?: () => void,
): Promise<SitePhotoSyncResult> {
  const have = await sitePhotoKeys();
  const keyOf = new Map<string, string>();
  for (const row of wanted) if (row.photoKey && have.get(row.serverId) !== row.photoKey) keyOf.set(row.serverId, row.photoKey);
  const queue = [...keyOf.keys()];
  const result: SitePhotoSyncResult = { saved: 0, missing: 0, failed: false, pending: 0 };
  for (let round = 0; queue.length && round < MAX_ROUNDS; round += 1) {
    const ids = queue.splice(0, SITE_PHOTO_BATCH);
    let reply: SitePhotoReply;
    try {
      reply = await fetchBatch(ids);
    } catch {
      result.failed = true;
      result.pending = queue.length + ids.length;
      return result;
    }
    for (const photo of reply.photos) {
      if (!ids.includes(photo.serverId)) continue;
      await putSitePhoto({ id: photo.serverId, key: photo.key, data: photo.data, savedAt: new Date().toISOString() });
      result.saved += 1;
      onSaved?.();
    }
    result.missing += reply.missing.filter((id) => ids.includes(id)).length;
    const again = reply.deferred.filter((id) => ids.includes(id));
    // A deferred id alone in its batch would never fit: treat as missing instead of looping.
    if (again.length && reply.photos.length === 0) result.missing += again.length;
    else queue.push(...again);
  }
  result.pending = queue.length;
  return result;
}
