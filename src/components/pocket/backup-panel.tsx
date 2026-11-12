import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileText } from "lucide-react";
import { listPocketBookings, type PocketBooking } from "@/lib/pocket-book";
import { writePocketSettings, type PocketSettings } from "@/lib/pocket/settings";
import type { ProfessionPack } from "@/lib/pocket/professions";
import {
  MAX_BACKUP_BYTES,
  commitBackup,
  currentBackup,
  mergeBackup,
  parsePocketBackup,
  readImportRecovery,
  type PocketBackup,
} from "@/lib/pocket/backup";
import { createBookingPdf, savePocketFile } from "@/lib/pocket/documents";
export function PocketBackupPanel({
  rows,
  settings,
  pack,
  onImported,
}: {
  rows: PocketBooking[];
  settings: PocketSettings;
  pack: ProfessionPack;
  onImported: (rows: PocketBooking[]) => void;
}) {
  const [pending, setPending] = useState<PocketBackup | null>(null);
  const [replace, setReplace] = useState(false);
  const [restoreSettings, setRestoreSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const en = settings.locale === "en";
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.name === "ZodError"
            ? "ساختار فایل معتبر نیست؛ هیچ داده‌ای تغییر نکرد."
            : error.message
          : "عملیات انجام نشد؛ حافظه را بررسی کنید.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pocket-backup pocket-card" aria-label="JSON و PDF">
      <h2>{en ? "Files & backup" : "فایل‌ها و پشتیبان‌گیری"}</h2>
      <p className="pocket-muted">
        {en
          ? "The only backup file: appointments, trainees, trainee payments and the full cash box. Personal data — keep it private."
          : "تنها فایل پشتیبان اپ: همه نوبت‌ها، هنرجوها، واریزی هنرجوها و کل صندوق (درآمد/هزینه). ورود فایل هرگز دسترسی مالک نمی‌دهد. فایل حاوی اطلاعات شخصی است؛ آن را امن نگه دارید."}
      </p>
      <div className="pocket-file-actions">
        <button
          type="button"
          disabled={busy}
          className="pocket-btn pocket-btn-ghost"
          onClick={() =>
            void run(async () => {
              const data = await currentBackup(await listPocketBookings(), settings);
              const json = JSON.stringify(data, null, 2);
              parsePocketBackup(json);
              await savePocketFile(
                "kasbokar-backup.json",
                "application/json",
                new TextEncoder().encode(json),
              );
              toast.success(en ? "JSON saved" : "فایل JSON ذخیره شد");
            })
          }
        >
          <Download size={18} />
          {en ? "Export JSON" : "خروجی JSON"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="pocket-btn pocket-btn-ghost"
          onClick={() => input.current?.click()}
        >
          <Upload size={18} />
          {en ? "Import JSON" : "وارد کردن JSON"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="pocket-btn pocket-btn-primary"
          onClick={() =>
            void run(async () => {
              await savePocketFile(
                "kasbokar-appointments.pdf",
                "application/pdf",
                await createBookingPdf(rows, pack),
              );
              toast.success(en ? "PDF saved" : "فایل PDF ذخیره شد");
            })
          }
        >
          <FileText size={18} />
          {en ? "Download PDF" : "دانلود PDF نوبت‌ها"}
        </button>
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept="application/json,.json"
        aria-label="انتخاب فایل JSON"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void run(async () => {
            if (file.size > MAX_BACKUP_BYTES) throw new Error("حداکثر حجم فایل ۲۴ مگابایت است.");
            const data = parsePocketBackup(await file.text());
            setPending(data);
            setReplace(false);
            setRestoreSettings(false);
          });
        }}
      />
      {pending ? (
        <div
          className="pocket-import-review"
          role="dialog"
          aria-modal="false"
          aria-label="تأیید وارد کردن فایل"
        >
          <h3>{en ? "Review import" : "بررسی فایل قبل از ورود"}</h3>
          <p>
            {pending.bookings.length} نوبت • {pending.trainees.length} هنرجو •{" "}
            {pending.traineePayments.length} واریزی •{" "}
            {pending.cashEntries === undefined ? "بدون بخش صندوق (فایل قدیمی؛ صندوق دست نمی‌خورد)" : `${pending.cashEntries.length} ردیف صندوق`}
          </p>
          <p>
            داده‌های فعلی حذف نمی‌شوند. موارد جدید اضافه می‌شوند؛ در حالت عادی موارد هم‌شناسهٔ گوشی
            حفظ می‌شوند. تنظیم زبان و شغل تغییر نمی‌کند.
          </p>
          {pending.settings ? (
            <label>
              <input type="checkbox" checked={restoreSettings} onChange={(e) => setRestoreSettings(e.target.checked)} data-testid="import-settings" />{" "}
              {en ? "Also restore language and profession from the file" : "زبان و شغل هم از فایل بازگردانده شود"}
            </label>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />{" "}
            جایگزینی موارد هم‌شناسه با محتوای فایل (نوبت، هنرجو و واریزی)
          </label>
          <div className="pocket-file-actions">
            <button
              type="button"
              className="pocket-btn pocket-btn-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    replace &&
                    !window.confirm(
                      en
                        ? "Items with the same id on this phone will be overwritten by the file. Continue?"
                        : "موارد هم‌شناسهٔ روی گوشی با محتوای فایل جایگزین می‌شوند. ادامه می‌دهید؟",
                    )
                  )
                    return;
                  // Merge into what is stored right now (not a list captured when the tab opened).
                  const before = await currentBackup(await listPocketBookings(), settings);
                  const next = mergeBackup(before, pending, replace);
                  await commitBackup(next, before);
                  onImported(next.bookings);
                  const restore = restoreSettings && pending.settings;
                  setPending(null);
                  toast.success("نوبت‌ها، هنرجوها و صندوق با موفقیت وارد شدند.");
                  if (restore) {
                    writePocketSettings({ ...restore, onboarded: true });
                    window.setTimeout(() => window.location.reload(), 600);
                  }
                })
              }
            >
              تأیید و وارد کردن
            </button>
            <button
              className="pocket-btn pocket-btn-ghost"
              type="button"
              onClick={() => setPending(null)}
            >
              لغو
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="pocket-btn pocket-btn-ghost"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const recovery = await readImportRecovery();
            if (!recovery) throw new Error("هنوز نسخه قبل از ورود فایل وجود ندارد.");
            setPending(recovery);
            setReplace(true);
          })
        }
      >
        بازیابی موارد از نسخه قبل از آخرین ورود فایل
      </button>
      {busy ? <p role="status">{en ? "Working…" : "در حال انجام…"}</p> : null}
    </section>
  );
}
