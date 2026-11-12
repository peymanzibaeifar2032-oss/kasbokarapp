/**
 * Replace every row of one store inside an open readwrite transaction. A synchronous put() failure
 * (e.g. DataCloneError) aborts the transaction, so the earlier clear() can never commit on its own.
 */
export function replaceStoreRows<T>(tx: IDBTransaction, storeName: string, rows: readonly T[]) {
  const store = tx.objectStore(storeName);
  try {
    store.clear();
    for (const row of rows) store.put(row);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* already finished */
    }
    throw error;
  }
}
