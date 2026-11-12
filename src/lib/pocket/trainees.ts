import { assertCanMutate } from "./license-gate.ts";
import { openPocketDb } from "../pocket-book.ts";
import { replaceStoreRows } from "./idb-safe.ts";

export type Trainee = {
  id: string;
  name: string;
  phone: string;
  honorific: string;
  sessionGoal: number;
  sessionsDone: number;
  feeTotalToman: number;
  paidToman: number;
  notes: string;
  startedOn: string;
  createdAt: string;
  serverId?: string;
  debtToman?: number;
};

export type TraineePayment = {
  id: string;
  traineeId: string;
  amountToman: number;
  paidOn: string;
  note: string;
};

const DB_NAME = "pocket-trainees";
const PEOPLE = "people";
const PAYMENTS = "payments";

let migration: Promise<void> | undefined;
async function openDb() {
  if (!migration)
    migration = migrateLegacyTrainees().catch((error) => {
      migration = undefined;
      throw error;
    });
  await migration;
  return openPocketDb();
}
/** Copy, never delete, the previous separate database. The marker and copied rows commit together. */
async function migrateLegacyTrainees() {
  const db = await openPocketDb();
  const check = db.transaction("metadata", "readonly");
  const marker = await new Promise<unknown>((resolve, reject) => {
    const request = check.objectStore("metadata").get("trainees-v1-migrated");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (marker) {
    db.close();
    return;
  }
  const old = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const name of [PEOPLE, PAYMENTS])
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const read = async (name: string) =>
    new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = old.transaction(name, "readonly").objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const [people, payments] = await Promise.all([read(PEOPLE), read(PAYMENTS)]);
  old.close();
  const tx = db.transaction([PEOPLE, PAYMENTS, "metadata"], "readwrite");
  for (const person of people) tx.objectStore(PEOPLE).put(person);
  for (const payment of payments) tx.objectStore(PAYMENTS).put(payment);
  tx.objectStore("metadata").put({ id: "trainees-v1-migrated", at: new Date().toISOString() });
  await txDone(tx);
  db.close();
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listTrainees() {
  const db = await openDb();
  const tx = db.transaction(PEOPLE, "readonly");
  const request = tx.objectStore(PEOPLE).getAll();
  const rows = await new Promise<Trainee[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as Trainee[]) || []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fa"));
}

export async function saveTrainees(rows: Trainee[]) {
  assertCanMutate();
  const db = await openDb();
  try {
    const tx = db.transaction(PEOPLE, "readwrite");
    const done = txDone(tx);
    try {
      replaceStoreRows(tx, PEOPLE, rows);
    } catch (error) {
      done.catch(() => undefined);
      throw error;
    }
    await done;
  } finally {
    db.close();
  }
}

export async function listTraineePayments() {
  const db = await openDb();
  const tx = db.transaction(PAYMENTS, "readonly");
  const request = tx.objectStore(PAYMENTS).getAll();
  const rows = await new Promise<TraineePayment[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as TraineePayment[]) || []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => String(b.paidOn || "").localeCompare(String(a.paidOn || "")));
}

export async function saveTraineePayments(rows: TraineePayment[]) {
  assertCanMutate();
  const db = await openDb();
  try {
    const tx = db.transaction(PAYMENTS, "readwrite");
    const done = txDone(tx);
    try {
      replaceStoreRows(tx, PAYMENTS, rows);
    } catch (error) {
      done.catch(() => undefined);
      throw error;
    }
    await done;
  } finally {
    db.close();
  }
}

export function newTraineeId() {
  return `trainee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newTraineePaymentId() {
  return `tpay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function traineeRemaining(sessionsDone: number, sessionGoal = 12) {
  return Math.max(0, sessionGoal - sessionsDone);
}

export function traineeBalance(feeTotalToman: number, paidToman: number) {
  return feeTotalToman - paidToman;
}

/** Old JSON may carry an aggregate paid total without a payment ledger. */
export function traineePaidAmount(person: Trainee, payments: TraineePayment[]) {
  const ledger = payments.filter((p) => p.traineeId === person.id);
  return ledger.length ? ledger.reduce((sum, p) => sum + p.amountToman, 0) : person.paidToman;
}
