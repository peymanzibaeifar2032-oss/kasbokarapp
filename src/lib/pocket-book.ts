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
  serverId: string | null;
  pinned: boolean;
};

export type PocketIncoming = {
  serverId: string;
  day: string;
  time: string;
  name: string;
  phone: string;
  style: string;
  placement: string;
};

const DB_NAME = "tattoo-pocket";
const STORE = "bookings";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
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
  const db = await openDb();
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
  const db = await openDb();
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
    if (existing?.pinned) continue;
    next.set(key, {
      id: existing?.id || `srv-${item.serverId}`,
      serverId: item.serverId,
      day: item.day,
      time: item.time,
      name: item.name,
      phone: item.phone,
      style: item.style,
      placement: item.placement,
      note: existing?.note || "",
      priceToman: existing?.priceToman || 0,
      sizeCm: existing?.sizeCm || "",
      photo: existing?.photo || "",
      pinned: false,
    });
  }
  return [...next.values()];
}

export function newPocketId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
