import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CloudDownload, Trash2, Wallet } from "lucide-react";
import { toFaDigits } from "@/lib/calendar/jalali";
import { listCashEntries, newCashId, readServerCashSummary, saveCashEntries, summarizeCash, type CashEntry, type CashEntryKind, type ServerCashSummary } from "@/lib/pocket/cash-box";
import { JALALI_MONTHS } from "@/lib/calendar/jalali";
import type { PocketLocale, ProfessionPack } from "@/lib/pocket/professions";
import { packText } from "@/lib/pocket/professions";
import "./pocket.css";

type Props = { locale: PocketLocale; pack: ProfessionPack; todayKey: string; serverStatus?: string; onSyncAll?: () => Promise<void>; syncBusy?: boolean };

function tomanText(value: number, locale: PocketLocale) {
  const amount = Math.round(Number(value) || 0);
  const formatted = new Intl.NumberFormat("en-US").format(amount);
  const digits = locale === "en" ? formatted : toFaDigits(formatted);
  return locale === "en" ? `${digits} toman` : `${digits} تومان`;
}

export function PocketCashPanel({ locale, pack, todayKey, serverStatus, onSyncAll, syncBusy }: Props) {
  const [rows, setRows] = useState<CashEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CashEntryKind>("income");
  const [note, setNote] = useState("");
  const [server, setServer] = useState<ServerCashSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "server" | "manual">("all");

  useEffect(() => {
    void listCashEntries()
      .then(setRows)
      .catch(() => toast.error(locale === "en" ? "Cash box storage failed." : "حافظهٔ صندوق باز نشد."))
      .finally(() => setReady(true));
    void readServerCashSummary().then(setServer).catch(() => setServer(null));
  }, [locale]);

  const summary = useMemo(() => summarizeCash(rows), [rows]);
  const hasServer = rows.some((row) => row.serverId);
  const visible = rows.filter((row) => (filter === "all" ? true : filter === "server" ? row.serverId : !row.serverId));
  const serverKeys = useMemo(
    () => new Set(rows.filter((row) => row.serverId).map((row) => `${row.day}|${row.kind}|${row.amountToman}`)),
    [rows],
  );

  // Save first: a blocked (unlicensed) or failed write must never show as if it had been stored.
  async function persist(next: CashEntry[]) {
    await saveCashEntries(next);
    setRows(next);
  }

  async function addEntry() {
    const cleanTitle = title.trim();
    const toman = Number(amount.replace(/\D/g, "")) || 0;
    if (cleanTitle.length < 2) return toast.error(locale === "en" ? "Write a title." : "عنوان را بنویس.");
    if (toman <= 0) return toast.error(locale === "en" ? "Enter an amount." : "مبلغ را بنویس.");
    await persist([
      { id: newCashId(), day: todayKey, kind, title: cleanTitle, amountToman: toman, note: note.trim(), createdAt: new Date().toISOString() },
      ...rows,
    ]);
    setTitle("");
    setAmount("");
    setNote("");
    toast.success(locale === "en" ? "Saved in cash box." : "در صندوق ذخیره شد.");
  }

  async function remove(id: string) {
    if (!window.confirm(locale === "en" ? "Delete this entry?" : "این ردیف از صندوق حذف شود؟")) return;
    await persist(rows.filter((row) => row.id !== id));
  }

  return (
    <section className="grid gap-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Wallet size={18} aria-hidden color="var(--pk-accent)" />
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>{packText(pack, locale, "cashLabelFa", "cashLabelEn")}</h2>
      </div>
      <p className="pocket-muted" style={{ margin: 0 }}>
        {locale === "en"
          ? "Offline cash box on this phone. Manual rows stay local. The studio owner's site ledger is copied here after Download appointments."
          : "صندوق آفلاین روی همین گوشی. ردیف‌های دستی فقط روی گوشی می‌مانند؛ دفتر مالی سایت صاحب استودیو بعد از «دانلود نوبت‌ها» همین‌جا کپی می‌شود."}
      </p>
      {onSyncAll ? (
        <button type="button" className="pocket-btn pocket-btn-primary" data-testid="cash-sync-all" disabled={syncBusy} onClick={() => void onSyncAll()}>
          <CloudDownload size={18} aria-hidden />
          {syncBusy ? "در حال بارگذاری…" : "بارگذاری صندوق و نوبت‌ها از سایت"}
        </button>
      ) : null}
      {serverStatus ? <p className="pocket-banner" data-testid="cash-server-status">{serverStatus}</p> : null}
      {server ? (
        <div className="pocket-card" data-testid="cash-server-summary" style={{ borderColor: "#7dd3fc", background: "#f0f9ff" }}>
          <p style={{ margin: 0, fontWeight: 900 }}>{locale === "en" ? "Site ledger (studio money tab)" : "دفتر مالی سایت (مثل تب پول پنل)"}</p>
          <p className="pocket-muted" style={{ margin: "0.3rem 0 0.6rem", fontSize: "0.78rem" }}>
            {(locale === "en" ? "Downloaded " : "دریافت از سایت: ") + new Date(server.generatedAt).toLocaleString(locale === "en" ? "en-US" : "fa-IR", { timeZone: "Asia/Tehran" })}
            {" · "}
            {(locale === "en" ? "rows: " : "ردیف: ") + (locale === "en" ? server.recordCount : toFaDigits(server.recordCount))}
          </p>
          <div className="pocket-stat-grid">
            <div className="pocket-stat is-cash"><p>{locale === "en" ? "Income (site)" : "درآمد سایت"}</p><p>{tomanText(server.summary.incomeToman, locale)}</p></div>
            <div className="pocket-stat is-cash"><p>{locale === "en" ? "Expenses (site)" : "هزینه سایت"}</p><p>{tomanText(server.summary.expenseToman, locale)}</p></div>
            <div className="pocket-stat is-cash"><p>{locale === "en" ? "Balance (site)" : "مانده سایت"}</p><p>{tomanText(server.summary.balanceToman, locale)}</p></div>
            <div className="pocket-stat is-cash"><p>{locale === "en" ? "Customers still owe" : "طلب از مشتری‌ها"}</p><p>{tomanText(server.summary.openReceivableToman, locale)}</p></div>
          </div>
          <p style={{ margin: "0.75rem 0 0.35rem", fontWeight: 800 }}>
            {locale === "en" ? `This month ${server.currentMonth.jm}/${server.currentMonth.jy}` : `ماه جاری: ${JALALI_MONTHS[server.currentMonth.jm - 1]} ${toFaDigits(server.currentMonth.jy)}`}
          </p>
          <ul className="pocket-muted" style={{ margin: 0, paddingInlineStart: "1.1rem", lineHeight: 1.9, fontSize: "0.85rem" }}>
            <li>{locale === "en" ? "Paid in: " : "واریزی ماه: "}{tomanText(server.currentMonth.paid, locale)}</li>
            <li>{locale === "en" ? "Salon costs: " : "هزینه سالن: "}{tomanText(server.currentMonth.salonCost, locale)}</li>
            <li>{locale === "en" ? "Life costs: " : "هزینه زندگی: "}{tomanText(server.currentMonth.lifeCost, locale)}</li>
            <li>{locale === "en" ? "Salon profit: " : "سود سالن: "}{tomanText(server.currentMonth.salonProfit, locale)}</li>
            <li>{locale === "en" ? "Left over: " : "ته‌ماندهٔ ماه: "}{tomanText(server.currentMonth.leftover, locale)}</li>
            <li>{locale === "en" ? "Still owed this month: " : "طلب این ماه: "}{tomanText(server.currentMonth.remainingMonth, locale)}</li>
          </ul>
          {server.truncated ? (
            <p className="pocket-muted" style={{ fontSize: "0.78rem" }}>
              {locale === "en" ? "Only the newest 5,000 rows of each kind were sent." : "فقط ۵٬۰۰۰ ردیف آخر از هر نوع ارسال شد."}
            </p>
          ) : null}
        </div>
      ) : null}
      <p style={{ margin: 0, fontWeight: 800 }}>{locale === "en" ? "Whole box on this phone" : "کل صندوق روی گوشی"}{hasServer ? (locale === "en" ? " (site + manual)" : " (سایت + دستی)") : ""}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "0.5rem" }}>
        <div className="pocket-stat is-cash"><p>{locale === "en" ? "Income" : "واریز"}</p><p>{tomanText(summary.income, locale)}</p></div>
        <div className="pocket-stat is-cash"><p>{locale === "en" ? "Expense" : "هزینه"}</p><p>{tomanText(summary.expense, locale)}</p></div>
        <div className="pocket-stat is-cash"><p>{locale === "en" ? "Balance" : "مانده"}</p><p>{tomanText(summary.balance, locale)}</p></div>
      </div>
      <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); void addEntry(); }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className={`pocket-btn ${kind === "income" ? "pocket-btn-primary" : "pocket-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setKind("income")}>{locale === "en" ? "Income" : "واریز"}</button>
          <button type="button" className={`pocket-btn ${kind === "expense" ? "pocket-btn-primary" : "pocket-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setKind("expense")}>{locale === "en" ? "Expense" : "هزینه"}</button>
        </div>
        <input className="pocket-field" placeholder={locale === "en" ? "Title" : "عنوان"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="pocket-field" placeholder={locale === "en" ? "Amount (toman)" : "مبلغ به تومان"} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
        <textarea className="pocket-area" placeholder={locale === "en" ? "Note" : "یادداشت"} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="pocket-btn pocket-btn-primary">{locale === "en" ? "Save" : "ذخیره"}</button>
      </form>
      {hasServer ? (
        <div style={{ display: "flex", gap: "0.4rem" }} role="group">
          {(["all", "server", "manual"] as const).map((key) => (
            <button key={key} type="button" className={`pocket-btn ${filter === key ? "pocket-btn-primary" : "pocket-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setFilter(key)}>
              {key === "all" ? (locale === "en" ? "All" : "همه") : key === "server" ? (locale === "en" ? "From site" : "از سایت") : locale === "en" ? "Manual" : "دستی"}
            </button>
          ))}
        </div>
      ) : null}
      {!ready ? <p className="pocket-muted">{locale === "en" ? "Loading…" : "در حال خواندن…"}</p> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.55rem" }}>
        {visible.map((row) => (
          <li key={row.id} className="pocket-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 900 }}>{row.title}</p>
                <p className="pocket-muted" style={{ margin: "0.35rem 0 0" }}>
                  {(locale === "en" ? (row.kind === "income" ? "Income" : "Expense") : row.kind === "income" ? "واریز" : "هزینه")}
                  {" · "}
                  <span className="pocket-price">{tomanText(row.amountToman, locale)}</span>
                  {" · "}
                  {locale === "en" ? row.day : toFaDigits(row.day)}
                </p>
                {row.category || row.ref ? (
                  <p className="pocket-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>{[row.category, row.ref].filter(Boolean).join(" · ")}</p>
                ) : null}
                {row.note ? <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>{row.note}</p> : null}
                {row.serverId ? (
                  <span className="pocket-chip" style={{ marginTop: "0.35rem", display: "inline-block" }}>{locale === "en" ? "From site · read-only" : "از سایت · فقط خواندنی"}</span>
                ) : serverKeys.has(`${row.day}|${row.kind}|${row.amountToman}`) ? (
                  <span className="pocket-chip" style={{ marginTop: "0.35rem", display: "inline-block", background: "#fef3c7" }}>{locale === "en" ? "Same day & amount as a site row — check for duplicate" : "هم‌روز و هم‌مبلغ با ردیف سایت؛ تکراری نباشد"}</span>
                ) : null}
              </div>
              {row.serverId ? null : (
                <button type="button" className="pocket-btn pocket-btn-danger" aria-label={locale === "en" ? "Delete" : "حذف"} onClick={() => void remove(row.id)}><Trash2 size={16} /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
