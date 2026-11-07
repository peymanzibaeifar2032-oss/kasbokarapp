import { assertCanMutate } from "./license-gate.ts";
export type CashEntryKind = "income" | "expense";

export type CashEntry = {
  id: string;
  day: string;
  kind: CashEntryKind;
  title: string;
  amountToman: number;
  note: string;
  createdAt: string;
  /** Present only on rows copied from the owner's real site ledger. Manual rows never have it. */
  serverId?: string;
  source?: "server";
  category?: string;
  ref?: string;
};

export type ServerCashSummary = {
  generatedAt: string;
  truncated: boolean;
  summary: { incomeToman: number; expenseToman: number; balanceToman: number; openReceivableToman: number };
  currentMonth: {
    jy: number;
    jm: number;
    paid: number;
    remainingMonth: number;
    remainingAll: number;
    salonCost: number;
    lifeCost: number;
    expenseTotal: number;
    salonProfit: number;
    leftover: number;
  };
  recordCount: number;
};

export type ServerFinanceInput = Omit<ServerCashSummary, "recordCount"> & {
  records: {
    serverId: string;
    kind: CashEntryKind;
    day: string;
    amountToman: number;
    title: string;
    note: string;
    category: string;
    ref: string;
  }[];
};

const DB_NAME = "pocket-cash";
const STORE = "entries";
const META = "meta";
const SERVER_SUMMARY_KEY = "server-summary";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
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

export async function listCashEntries() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const rows = await new Promise<CashEntry[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as CashEntry[]) || []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt));
}

export const serverCashId = (serverId: string) => `srv-cash-${serverId}`;

/**
 * Pure merge: manual rows are kept untouched; server rows are keyed by their server id, so repeated
 * downloads update in place instead of duplicating. Server rows absent from a complete snapshot are dropped.
 */
export function mergeServerCash(local: CashEntry[], finance: ServerFinanceInput, now = new Date().toISOString()) {
  const manual = local.filter((row) => !row.serverId);
  const previous = new Map(local.filter((row) => row.serverId).map((row) => [row.serverId!, row]));
  const server: CashEntry[] = finance.records.map((row) => ({
    id: serverCashId(row.serverId),
    serverId: row.serverId,
    source: "server",
    day: row.day,
    kind: row.kind,
    title: row.title,
    amountToman: row.amountToman,
    note: row.note,
    category: row.category,
    ref: row.ref,
    createdAt: previous.get(row.serverId)?.createdAt || now,
  }));
  // A truncated snapshot is not a full list: keep older server rows we already had.
  const incoming = new Set(server.map((row) => row.serverId));
  const keptOld = finance.truncated ? [...previous.values()].filter((row) => !incoming.has(row.serverId)) : [];
  return [...manual, ...keptOld, ...server];
}

/** One readwrite transaction over entries + summary. Abort/quota failure leaves the previous box intact. */
export async function applyServerFinance(finance: ServerFinanceInput) {
  assertCanMutate();
  const db = await openDb();
  try {
    const tx = db.transaction([STORE, META], "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.getAll();
    const local = await new Promise<CashEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as CashEntry[]) || []);
      request.onerror = () => reject(request.error);
    });
    const next = mergeServerCash(local, finance);
    const keep = new Set(next.map((row) => row.id));
    for (const row of local) if (row.serverId && !keep.has(row.id)) store.delete(row.id);
    for (const row of next) if (row.serverId) store.put(row);
    const summary: ServerCashSummary & { id: string } = {
      id: SERVER_SUMMARY_KEY,
      generatedAt: finance.generatedAt,
      truncated: finance.truncated,
      summary: finance.summary,
      currentMonth: finance.currentMonth,
      recordCount: finance.records.length,
    };
    tx.objectStore(META).put(summary);
    await txDone(tx);
    return next;
  } finally {
    db.close();
  }
}

export async function readServerCashSummary(): Promise<ServerCashSummary | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(META, "readonly");
    const request = tx.objectStore(META).get(SERVER_SUMMARY_KEY);
    const row = await new Promise<(ServerCashSummary & { id: string }) | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as (ServerCashSummary & { id: string }) | undefined);
      request.onerror = () => reject(request.error);
    });
    await txDone(tx);
    return row ? (({ id: _id, ...rest }) => rest)(row) : null;
  } finally {
    db.close();
  }
}

export async function saveCashEntries(rows: CashEntry[]) {
  assertCanMutate();
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const row of rows) store.put(row);
  await txDone(tx);
  db.close();
}

export function newCashId() {
  return `cash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function summarizeCash(rows: CashEntry[]) {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.kind === "income") income += row.amountToman;
    else expense += row.amountToman;
  }
  return { income, expense, balance: income - expense };
}
