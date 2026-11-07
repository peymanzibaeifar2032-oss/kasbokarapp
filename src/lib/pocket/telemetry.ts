import { gregorianToJalali } from "@/lib/calendar/jalali";
import { listCashEntries } from "@/lib/pocket/cash-box";
import { aggregateCashForMonth } from "@/lib/pocket/revenue-month";
import { getOrCreateInstallId, readAccountEmail } from "@/lib/pocket/device";
import { friendlyError, saveAction } from "@/lib/save";

const QUEUE_KEY = "pocket.telemetry.queue.v1";

type Queued =
  | { type: "install"; installId: string; accountEmail?: string; platform: string; appVersion?: string }
  | { type: "revenue"; accountEmail: string; jy: number; jm: number; incomeToman: number; expenseToman: number };

function readQueue(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as Queued[];
  } catch {
    return [];
  }
}

function writeQueue(rows: Queued[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-40)));
}

export function queueInstallTelemetry(appVersion = "1.12.2-test") {
  const installId = getOrCreateInstallId();
  const accountEmail = readAccountEmail() || undefined;
  const queue: Queued[] = readQueue().filter((row) => row.type !== "install");
  queue.push({ type: "install", installId, accountEmail, platform: "android", appVersion });
  writeQueue(queue);
}

export async function queueCurrentMonthRevenue() {
  const email = readAccountEmail();
  if (!email) return;
  const rows = await listCashEntries();
  const now = new Date();
  const shifted = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  const j = gregorianToJalali(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  const sum = aggregateCashForMonth(
    rows.map((row) => ({ day: row.day, kind: row.kind, amountToman: row.amountToman })),
    j.jy,
    j.jm,
  );
  const queue = readQueue().filter((row) => !(row.type === "revenue" && row.jy === j.jy && row.jm === j.jm));
  queue.push({
    type: "revenue",
    accountEmail: email,
    jy: j.jy,
    jm: j.jm,
    incomeToman: sum.income,
    expenseToman: sum.expense,
  });
  writeQueue(queue);
}

async function postInstall(item: Extract<Queued, { type: "install" }>) {
  const res = await fetch("/api/app-telemetry", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "ثبت نصب نشد.");
  }
}

/** Best-effort flush. Never blocks offline use; failures stay queued. */
export async function flushTelemetryQueue() {
  // The APK native bridge is deliberately export-only. Keep telemetry queued locally;
  // never send relative API calls to the Android virtual asset host.
  if (typeof location !== "undefined" && location.hostname === "appassets.androidplatform.net") return { flushed: 0, error: null as string | null };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { flushed: 0, error: null as string | null };
  const queue = readQueue();
  if (!queue.length) return { flushed: 0, error: null as string | null };
  const remain: Queued[] = [];
  let flushed = 0;
  let error: string | null = null;
  for (const item of queue) {
    try {
      if (item.type === "install") await postInstall(item);
      else await saveAction("appTelemetryRevenue", item);
      flushed += 1;
    } catch (err) {
      remain.push(item);
      error = friendlyError(err);
    }
  }
  writeQueue(remain);
  return { flushed, error };
}
