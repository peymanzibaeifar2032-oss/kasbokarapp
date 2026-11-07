import type { BookingField } from "./pocket/professions.ts";
import { assertCanMutate } from "./pocket/license-gate.ts";

export type PocketCustomField = { id: string; label: string; value: string; kind: "text" };

export type PocketBooking = {
  id: string;
  day: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
  time: string;
  note: string;
  priceToman?: number;
  sizeCm?: string;
  photo?: string;
  professionId?: string;
  details?: Record<string, string>;
  fieldSchema?: BookingField[];
  customFields?: PocketCustomField[];
  serverId: string | null;
  pinned: boolean;
  server?: PocketServerDetails;
};

/** Extra read-only facts from the owner's real site export (tattoo_requests / bookings). */
export type PocketServerDetails = {
  phone2: string;
  instagram: string;
  sizeCm: string;
  requestType: string;
  idea: string;
  priceMinToman: number;
  priceMaxToman: number;
  depositToman: number;
  paidToman: number;
  sessionCount: number;
  sessionMinutes: number;
  bookingId: string;
  slotStart: string;
};

export type PocketIncoming = {
  serverId: string;
  day: string;
  time: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
  server?: PocketServerDetails;
};

const DB_NAME = "tattoo-pocket";
const STORE = "bookings";

export function openPocketDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [STORE, "people", "payments", "metadata"]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listPocketBookings() {
  const db = await openPocketDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const rows = await new Promise<PocketBooking[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as PocketBooking[]) || []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time) || a.name.localeCompare(b.name, "fa"));
}

export async function savePocketBookings(rows: PocketBooking[]) {
  assertCanMutate();
  const db = await openPocketDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const row of rows) store.put(row);
  await txDone(tx);
  db.close();
}

export function applyDownload(local: PocketBooking[], incoming: PocketIncoming[]) {
  const incomingIds = new Set(incoming.map((row) => row.serverId));
  const next = new Map<string, PocketBooking>();
  for (const row of local) {
    if (!row.serverId) next.set(row.id, row);
    else if (row.pinned || !incomingIds.has(row.serverId)) {
      if (row.pinned) next.set(`server:${row.serverId}`, row);
    }
  }
  for (const row of local) {
    if (row.serverId && row.pinned) next.set(`server:${row.serverId}`, row);
  }
  for (const item of incoming) {
    const key = `server:${item.serverId}`;
    const existing = local.find((row) => row.serverId === item.serverId);
    if (existing?.pinned) {
      // Local edits win; only refresh the read-only site facts used by the action buttons.
      if (item.server) next.set(key, { ...existing, server: item.server });
      continue;
    }
    next.set(key, {
      ...existing,
      id: existing?.id || `srv-${item.serverId}`,
      serverId: item.serverId,
      day: item.day,
      time: item.time,
      name: item.name,
      phone: item.phone,
      style: item.style,
      placement: item.placement,
      note: existing?.note || "",
      sizeCm: existing?.sizeCm || item.server?.sizeCm || "",
      priceToman: existing?.priceToman || item.server?.priceMinToman || 0,
      photo: existing?.photo || "",
      ...(item.server ? { server: item.server } : {}),
      pinned: false,
    });
  }
  return [...next.values()];
}

export function newPocketId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
