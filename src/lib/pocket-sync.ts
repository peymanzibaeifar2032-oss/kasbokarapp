/** Phone + Tehran day is the identity of a sitting. The site copy wins. */

export type PocketJob = {
  localId: string;
  serverId: string;
  customerName: string;
  customerPhone: string;
  customerPhone2: string;
  customerInstagram: string;
  placement: string;
  style: string;
  idea: string;
  sizeCm: string;
  priceMinToman: number;
  paidToman: number;
  slotStart: string;
  sessionMinutes: number;
  origin: "site" | "phone";
  syncError?: string;
};

export type PocketRequest = {
  localId: string;
  serverId: string;
  customerName: string;
  customerPhone: string;
  placement: string;
  style: string;
  idea: string;
  sizeCm: string;
  requestType: string;
  origin: "site" | "phone";
  syncError?: string;
};

export function phoneKey(raw: string) {
  const digits = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
  if (digits.startsWith("98") && digits.length >= 12) return digits.slice(-10);
  if (digits.startsWith("0")) return digits.slice(-10);
  return digits.slice(-10);
}

export function tehranDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function sittingKey(phone: string, slotStart: string) {
  const day = tehranDay(slotStart);
  const tail = phoneKey(phone);
  if (!day || tail.length < 10) return "";
  return `${tail}|${day}`;
}

export function planPocketUpload(local: PocketJob[], remote: PocketJob[]) {
  const seen = new Map<string, string>();
  for (const row of remote) {
    const key = sittingKey(row.customerPhone, row.slotStart);
    if (key && !seen.has(key)) seen.set(key, row.serverId);
  }
  const upload: PocketJob[] = [];
  const linked: { localId: string; serverId: string }[] = [];
  for (const row of local) {
    if (row.origin !== "phone" || row.serverId) continue;
    const key = sittingKey(row.customerPhone, row.slotStart);
    if (!key) continue;
    const serverId = seen.get(key);
    if (serverId) linked.push({ localId: row.localId, serverId });
    else {
      upload.push(row);
      seen.set(key, row.localId);
    }
  }
  return { upload, linked };
}

/** Site rows replace the mirror. Phone rows stay only until the site has accepted them. */
export function mergePocketJobs(
  local: PocketJob[],
  remote: PocketJob[],
  linked: { localId: string; serverId: string }[],
  failed: { localId: string; error: string }[],
) {
  const linkedIds = new Set(linked.map((row) => row.localId));
  const failedMap = new Map(failed.map((row) => [row.localId, row.error]));
  const pending = local.filter((row) => row.origin === "phone" && !row.serverId && !linkedIds.has(row.localId) && failedMap.has(row.localId));
  return [
    ...remote.map((row) => ({ ...row, origin: "site" as const, serverId: row.serverId, syncError: "" })),
    ...pending.map((row) => ({ ...row, syncError: failedMap.get(row.localId) || row.syncError || "" })),
  ];
}
