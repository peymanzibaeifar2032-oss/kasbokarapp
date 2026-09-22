import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { toFaDigits } from "@/lib/calendar/jalali";
import { friendlyError, saveAction } from "@/lib/save";
import {
  apprenticeRemaining,
  nextSessionNumber,
  type StudioApprentice,
  type StudioApprenticeBoard,
} from "@/lib/studio-apprentices";
import { cn } from "@/lib/utils";

export function StudioApprenticeBoard() {
  const [dayKey, setDayKey] = useState<string | undefined>(undefined);
  const [board, setBoard] = useState<StudioApprenticeBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(nextDay?: string) {
    setLoading(true);
    setError("");
    try {
      const data = await saveAction<StudioApprenticeBoard>("studioApprenticeBoard", {
        dayKey: nextDay,
      });
      setBoard(data);
      setDayKey(data.dayKey);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(type: string, payload: unknown) {
    setBusy(true);
    try {
      const data = await saveAction<StudioApprenticeBoard>(type, payload);
      if (data?.dayKey) {
        setBoard(data);
        setDayKey(data.dayKey);
      } else {
        await load(dayKey);
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function setDone(apprenticeId: string, sessionsDone: number) {
    setBusy(true);
    try {
      await saveAction("setApprenticeProgress", { apprenticeId, sessionsDone });
      toast.success("شمارش جلسه ثبت شد.");
      await load(dayKey);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !board) return <p className="mt-6 text-sm text-muted">در حال آماده کردن پنجشنبه‌ها…</p>;
  if (error && !board) {
    return (
      <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button className="mt-3" variant="outline" onClick={() => void load()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }
  if (!board) return null;
  const sina = board.roster.find((row) => row.kind === "substitute");

  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-bold">پنجشنبه‌های هنرجو</h2>
        <p className="mt-1 text-sm leading-7 text-muted">
          هر پنجشنبه سال برای هنرجوهاست و نوبت مشتری نمی‌گیرد. اگر کسی نیاید، همان روز استراحت است.
          ناهار ۱۲ تا ۱۳ قفل است. فقط «حاضر شد» جزو ۱۰ جلسه است. «کنسل شد» هیچ جلسه‌ای اضافه نمی‌کند.
        </p>
      </div>

      <div className="grid gap-3">
        {board.roster.map((person) => (
          <ApprenticeRosterCard
            key={person.id}
            person={person}
            disabled={busy}
            onSetDone={(n) => void setDone(person.id, n)}
          />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {board.thursdays.map((day) => (
          <button
            key={day.dayKey}
            type="button"
            disabled={busy}
            onClick={() => void load(day.dayKey)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm",
              day.dayKey === board.dayKey
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-muted",
            )}
          >
            {day.label}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold">{board.label}</p>

      {board.slots.map((slot) => {
        if (slot.kind === "lunch") {
          return (
            <article key={slot.id} className="rounded-3xl border border-dashed border-border bg-bg p-4">
              <p className="font-bold">{slot.label}</p>
              <p className="mt-1 text-sm text-muted">وقت ناهار تو. کسی در این ساعت نمی‌آید.</p>
            </article>
          );
        }
        return (
          <article key={slot.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold">{slot.label}</p>
                <p className="mt-1 text-sm">
                  {slot.person ? `${slot.person.name} · ${slot.person.phone}` : "هنرجو انتخاب نشده"}
                </p>
                {slot.person ? (
                  <p className="mt-1 text-xs text-muted">
                    جلسه {toFaDigits(nextSessionNumber(slot.person.sessionsDone))} از ۱۰ · مانده{" "}
                    {toFaDigits(apprenticeRemaining(slot.person.sessionsDone))}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  slot.status === "present"
                    ? "bg-emerald-100 text-emerald-900"
                    : slot.status === "absent"
                      ? "bg-amber-100 text-amber-950"
                      : "bg-bg text-muted",
                )}
              >
                {slot.status === "present" ? "حاضر" : slot.status === "absent" ? "کنسل · بدون شمارش" : "برنامه"}
              </span>
            </div>
            <label className="mt-3 grid gap-1.5 text-sm">
              <span className="font-medium">انتخاب هنرجو</span>
              <NativeSelect
                disabled={busy}
                value={slot.apprenticeId ?? ""}
                onChange={(e) =>
                  void run("assignApprenticeSlot", {
                    slotId: slot.id,
                    apprenticeId: e.target.value || null,
                  })
                }
              >
                <option value="">خالی</option>
                {board.roster.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.phone}
                    {person.kind === "substitute" ? " · جایگزین" : ""}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !slot.apprenticeId}
                onClick={() => void run("markApprenticeSlot", { slotId: slot.id, status: "present" })}
              >
                حاضر شد
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void run("markApprenticeSlot", { slotId: slot.id, status: "absent" })}
              >
                کنسل شد، جزو ۱۰ جلسه نیست
              </Button>
              {sina ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || slot.apprenticeId === sina.id}
                  onClick={() => void run("assignApprenticeSlot", { slotId: slot.id, apprenticeId: sina.id })}
                >
                  جایگزین با سینا
                </Button>
              ) : null}
              {slot.person?.phone ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${slot.person.phone}`}>تماس</a>
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ApprenticeRosterCard({
  person,
  disabled,
  onSetDone,
}: {
  person: StudioApprentice;
  disabled: boolean;
  onSetDone: (n: number) => void;
}) {
  const remaining = apprenticeRemaining(person.sessionsDone, person.sessionGoal);
  const done = person.sessionsDone >= person.sessionGoal;
  return (
    <article className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{person.name}</p>
          <a className="mt-1 inline-block text-sm text-accent" href={`tel:${person.phone}`} dir="ltr">
            {person.phone}
          </a>
          <p className="mt-1 text-xs text-muted">
            {person.kind === "substitute" ? "جایگزین هفته · " : ""}
            {done ? "دوره ۱۰ جلسه تمام شد" : `جلسه ${toFaDigits(nextSessionNumber(person.sessionsDone))} از ۱۰`}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", done ? "bg-primary text-primary-fg" : "bg-bg text-muted")}>
          مانده {toFaDigits(remaining)}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">خانه جلسه چندم را بزن؛ از همان عدد تا ۱۰ شمرده می‌شود.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: person.sessionGoal }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onSetDone(n === person.sessionsDone ? n - 1 : n)}
            className={cn(
              "size-9 rounded-xl text-sm font-bold",
              n <= person.sessionsDone ? "bg-primary text-primary-fg" : "border border-border bg-bg text-muted",
            )}
          >
            {toFaDigits(n)}
          </button>
        ))}
      </div>
    </article>
  );
}
