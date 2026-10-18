import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { jalaliDayLabel, tehranDayKey } from "@/lib/hours";
import {
  DELAY_REASONS,
  KIND_LABEL,
  STATUS_LABEL,
  TASK_STATUS_LABEL,
  goalProgress,
  shiftKey,
  type ActionRow,
  type DeadlineChange,
  type DelayReview,
  type GoalEvent,
  type GoalKind,
  type GoalRow,
  type GoalStatus,
  type TaskRow,
  type TaskStatus,
} from "@/lib/personal-goals";
import { friendlyError, saveAction } from "@/lib/save";

type Board = {
  today: string;
  weekStart: string;
  weekEnd: string;
  categories: { id: string; label: string }[];
  goals: GoalRow[];
  tasks: TaskRow[];
  actions: ActionRow[];
  notes: { dayKey: string; note: string }[];
  reviews: DelayReview[];
  deadlineChanges: DeadlineChange[];
  events: GoalEvent[];
  weekReview: { wentWell: string; blocked: string; nextFocus: string } | null;
  alerts: { kind: string; text: string; goalId: string }[];
  counts: { active: number; done: number; soon: number; overdue: number; stalled: number; adherence: number | null };
  progressByGoal: Record<string, number>;
  reasons: string[];
};

type View = "dash" | "form" | "goal" | "week" | "report";

const emptyForm = {
  id: "",
  title: "",
  category: "رشد فردی و نظم شخصی",
  customCategory: "",
  why: "",
  outcome: "",
  successMetric: "",
  startDate: "",
  deadline: "",
  importance: "medium" as "high" | "medium" | "low",
  kind: "main" as GoalKind,
  estimateHours: "0",
  weeklyHours: "0",
  status: "idea" as GoalStatus,
  blockers: "",
  firstAction: "",
};

function dayText(key: string) {
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  return jalaliDayLabel(y, m, d);
}

function weekStartOf(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return shiftKey(dayKey, -((weekday + 1) % 7));
}

export function GoalsBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [view, setView] = useState<View>("dash");
  const [goalId, setGoalId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [blocking, setBlocking] = useState<{ id: string; title: string; kind: GoalKind }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await saveAction<Board>("personalGoalBoard");
    setBoard(next);
    return next;
  }

  useEffect(() => {
    void load().catch((err) => setError(friendlyError(err)));
  }, []);

  async function run(type: string, payload: unknown) {
    setBusy(true);
    try {
      const next = await saveAction<Board | { needsDecision: true; blocking: { id: string; title: string; kind: GoalKind }[] }>(type, payload);
      if (next && typeof next === "object" && "needsDecision" in next && next.needsDecision) {
        setBlocking(next.blocking);
        return null;
      }
      setBlocking([]);
      setBoard(next as Board);
      return next as Board;
    } catch (err) {
      toast.error(friendlyError(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function openNew() {
    setForm({ ...emptyForm, startDate: board?.today || tehranDayKey(), deadline: shiftKey(board?.today || tehranDayKey(), 30) });
    setBlocking([]);
    setView("form");
  }

  function openEdit(goal: GoalRow) {
    setForm({
      id: goal.id,
      title: goal.title,
      category: goal.category,
      customCategory: "",
      why: goal.why,
      outcome: goal.outcome,
      successMetric: goal.successMetric,
      startDate: goal.startDate,
      deadline: goal.deadline,
      importance: goal.importance,
      kind: goal.kind,
      estimateHours: String(goal.estimateHours),
      weeklyHours: String(goal.weeklyHours),
      status: goal.status,
      blockers: goal.blockers,
      firstAction: goal.firstAction,
    });
    setBlocking([]);
    setView("form");
  }

  async function saveGoal(resolve?: { id: string; decision: "pause" | "postpone" | "waiting" }) {
    const category = form.category === "سفارشی" ? form.customCategory.trim() : form.category;
    const saved = await run("savePersonalGoal", {
      id: form.id || undefined,
      title: form.title,
      category,
      why: form.why,
      outcome: form.outcome,
      successMetric: form.successMetric,
      startDate: form.startDate,
      deadline: form.deadline,
      importance: form.importance,
      kind: form.kind,
      estimateHours: Number(form.estimateHours || 0),
      weeklyHours: Number(form.weeklyHours || 0),
      status: form.status,
      blockers: form.blockers,
      firstAction: form.firstAction,
      resolve,
    });
    if (saved) {
      toast.success("هدف ذخیره شد.");
      setView("dash");
    }
  }

  if (error) return <p className="mt-4 rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>;
  if (!board) return <p className="mt-4 text-sm text-muted">در حال خواندن اهداف…</p>;

  const openGoals = board.goals.filter((goal) => !goal.archived);
  const selected = board.goals.find((goal) => goal.id === goalId) ?? null;

  return (
    <section className="mt-4 grid gap-4">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-[#1C3D52]/8 p-1 text-sm font-bold">
        {(
          [
            ["dash", "خانه"],
            ["week", "این هفته"],
            ["report", "گزارش"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`h-10 shrink-0 rounded-xl px-3 ${view === id ? "bg-[#1C3D52] text-white" : "text-[#1C3D52]"}`} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
        <button type="button" className="h-10 shrink-0 rounded-xl px-3 text-[#1C3D52]" onClick={openNew}>هدف جدید</button>
      </div>

      {view === "dash" ? (
        <Dashboard
          board={board}
          goals={openGoals}
          onOpen={(id) => { setGoalId(id); setView("goal"); }}
        />
      ) : null}
      {view === "form" ? (
        <GoalForm
          form={form}
          setForm={setForm}
          categories={board.categories.map((row) => row.label)}
          busy={busy}
          blocking={blocking}
          onSave={(resolve) => void saveGoal(resolve)}
          onClose={() => setView("dash")}
        />
      ) : null}
      {view === "goal" && selected ? (
        <GoalDetail
          board={board}
          goal={selected}
          busy={busy}
          run={run}
          onEdit={() => openEdit(selected)}
          onBack={() => setView("dash")}
        />
      ) : null}
      {view === "week" ? <WeekPlan board={board} busy={busy} run={run} /> : null}
      {view === "report" ? <Report board={board} /> : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1C3D52]/10 bg-[#F4EFE6] p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#1C3D52]">{value}</p>
    </div>
  );
}

function Dashboard({ board, goals, onOpen }: { board: Board; goals: GoalRow[]; onOpen: (id: string) => void }) {
  const soon = goals.filter((goal) => goal.status === "active" && goal.deadline >= board.today && goal.deadline <= shiftKey(board.today, 7));
  const overdue = goals.filter((goal) => goal.status !== "done" && goal.status !== "cancelled" && goal.deadline < board.today && (goal.status === "active" || goal.status === "ready" || goal.status === "review"));
  const stalled = goals.filter((goal) => goal.status === "paused" || goal.status === "postponed" || goal.status === "review");
  const waiting = goals.filter((goal) => goal.status === "waiting" || goal.status === "idea");
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="هدف فعال" value={String(board.counts.active)} />
        <Stat label="تکمیل‌شده" value={String(board.counts.done)} />
        <Stat label="نزدیک به موعد" value={String(soon.length)} />
        <Stat label="عقب‌افتاده" value={String(overdue.length)} />
        <Stat label="پایبندی این هفته" value={board.counts.adherence == null ? "داده کافی نیست" : `${board.counts.adherence}٪`} />
        <Stat label="نیازمند تصمیم" value={String(stalled.length)} />
      </div>
      {board.alerts.length ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-7">
          {board.alerts.map((alert) => <p key={alert.kind + alert.text}>{alert.text}</p>)}
        </div>
      ) : <p className="text-sm text-muted">هشدار بازی وجود ندارد.</p>}
      <GoalList title="در حال اجرا" goals={goals.filter((goal) => goal.status === "active" || goal.status === "ready")} progress={board.progressByGoal} onOpen={onOpen} empty="هدف فعالی نیست." />
      <GoalList title="نزدیک به موعد" goals={soon} progress={board.progressByGoal} onOpen={onOpen} empty="در هفت روز آینده موعودی نیست." />
      <GoalList title="عقب‌افتاده، نیازمند بررسی" goals={overdue} progress={board.progressByGoal} onOpen={onOpen} empty="هدف عقب‌افتاده‌ای نیست." />
      <GoalList title="متوقف یا نیازمند تصمیم" goals={stalled} progress={board.progressByGoal} onOpen={onOpen} empty="موردی نیست." />
      <GoalList title="فهرست انتظار" goals={waiting} progress={board.progressByGoal} onOpen={onOpen} empty="ایده‌ای در انتظار نیست." />
      <div>
        <h3 className="font-bold">فعالیت اخیر</h3>
        {!board.events.length ? <p className="mt-2 text-sm text-muted">هنوز فعالیتی ثبت نشده.</p> : (
          <ul className="mt-2 grid gap-2 text-sm">
            {board.events.slice(0, 8).map((event) => (
              <li key={event.id} className="rounded-xl bg-surface px-3 py-2">{event.note || event.kind}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GoalList({ title, goals, progress, onOpen, empty }: { title: string; goals: GoalRow[]; progress: Record<string, number>; onOpen: (id: string) => void; empty: string }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      {!goals.length ? <p className="mt-2 text-sm text-muted">{empty}</p> : (
        <ul className="mt-2 grid gap-2">
          {goals.map((goal) => {
            const percent = goal.status === "done" ? 100 : progress[goal.id] ?? 0;
            return (
              <li key={goal.id}>
                <button type="button" className="w-full rounded-2xl border border-border bg-surface p-3 text-right" onClick={() => onOpen(goal.id)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{goal.title}</span>
                    <span className="text-xs text-muted">{STATUS_LABEL[goal.status]} · {percent}٪</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <span className="block h-full bg-[#2F6F68]" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-muted">{KIND_LABEL[goal.kind]} · تا {dayText(goal.deadline)}{goal.postponeCount ? ` · ${goal.postponeCount} بار تعویق` : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GoalForm({
  form, setForm, categories, busy, blocking, onSave, onClose,
}: {
  form: typeof emptyForm;
  setForm: (value: typeof emptyForm) => void;
  categories: string[];
  busy: boolean;
  blocking: { id: string; title: string; kind: GoalKind }[];
  onSave: (resolve?: { id: string; decision: "pause" | "postpone" | "waiting" }) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<typeof emptyForm>) => setForm({ ...form, ...patch });
  return (
    <form className="grid gap-3 rounded-3xl border border-border bg-surface p-4" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <h3 className="font-bold">{form.id ? "ویرایش هدف" : "هدف جدید"}</h3>
      <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="عنوان هدف" />
      <NativeSelect value={form.category} onChange={(e) => set({ category: e.target.value })}>
        {categories.map((label) => <option key={label} value={label}>{label}</option>)}
        <option value="سفارشی">دسته‌بندی سفارشی</option>
      </NativeSelect>
      {form.category === "سفارشی" ? <Input value={form.customCategory} onChange={(e) => set({ customCategory: e.target.value })} placeholder="نام دسته" /> : null}
      <Textarea value={form.why} onChange={(e) => set({ why: e.target.value })} placeholder="چرا می‌خواهم به آن برسم؟" />
      <Textarea value={form.outcome} onChange={(e) => set({ outcome: e.target.value })} placeholder="نتیجه نهایی قابل اندازه‌گیری" />
      <Textarea value={form.successMetric} onChange={(e) => set({ successMetric: e.target.value })} placeholder="از کجا بفهمم به نتیجه رسیده‌ام؟" />
      <label className="text-sm">شروع<JalaliDatePicker value={form.startDate} onChange={(startDate) => set({ startDate })} label="تاریخ شروع" /></label>
      <label className="text-sm">مهلت<JalaliDatePicker value={form.deadline} onChange={(deadline) => set({ deadline })} label="مهلت نهایی" /></label>
      <NativeSelect value={form.importance} onChange={(e) => set({ importance: e.target.value as typeof form.importance })}>
        <option value="high">اهمیت زیاد</option>
        <option value="medium">اهمیت متوسط</option>
        <option value="low">اهمیت کم</option>
      </NativeSelect>
      <NativeSelect value={form.kind} onChange={(e) => set({ kind: e.target.value as GoalKind })}>
        <option value="main">اصلی</option>
        <option value="side">فرعی</option>
        <option value="support">پروژه پشتیبان</option>
        <option value="routine">کار روزمره، بدون محدودیت تمرکز</option>
      </NativeSelect>
      <Input inputMode="numeric" value={form.estimateHours} onChange={(e) => set({ estimateHours: e.target.value.replace(/[^\d.]/g, "") })} placeholder="زمان تخمینی، ساعت" />
      <Input inputMode="numeric" value={form.weeklyHours} onChange={(e) => set({ weeklyHours: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ساعت در هفته" />
      <NativeSelect value={form.status} onChange={(e) => set({ status: e.target.value as GoalStatus })}>
        <option value="idea">ایده</option>
        <option value="ready">آماده شروع</option>
        <option value="active">در حال اجرا</option>
        <option value="waiting">فهرست انتظار</option>
      </NativeSelect>
      <Textarea value={form.blockers} onChange={(e) => set({ blockers: e.target.value })} placeholder="موانع احتمالی و منابع لازم" />
      <Input value={form.firstAction} onChange={(e) => set({ firstAction: e.target.value })} placeholder="اولین اقدام مشخص" />
      {blocking.length ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-7">
          <p>اگر این را فعال کنی از حد تمرکز می‌گذری. یکی از هدف‌های فعلی را انتخاب کن.</p>
          {blocking.map((goal) => (
            <div key={goal.id} className="mt-2 grid gap-2">
              <p className="font-bold">{goal.title}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => onSave({ id: goal.id, decision: "pause" })}>این را متوقف کن</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onSave({ id: goal.id, decision: "postpone" })}>این را به تعویق بینداز</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onSave({ id: goal.id, decision: "waiting" })}>هدف جدید برود به انتظار</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>ذخیره</Button>
        <Button type="button" variant="outline" onClick={onClose}>بستن</Button>
      </div>
    </form>
  );
}

function GoalDetail({
  board, goal, busy, run, onEdit, onBack,
}: {
  board: Board;
  goal: GoalRow;
  busy: boolean;
  run: (type: string, payload: unknown) => Promise<Board | null>;
  onEdit: () => void;
  onBack: () => void;
}) {
  const tasks = board.tasks.filter((task) => task.goalId === goal.id);
  const percent = goal.status === "done" ? 100 : goalProgress(tasks);
  const changes = board.deadlineChanges.filter((row) => row.goalId === goal.id);
  const reviews = board.reviews.filter((row) => row.goalId === goal.id);
  const [task, setTask] = useState({ title: "", detail: "", startDate: board.today, dueDate: goal.deadline, estimateHours: "1", priority: "medium" as TaskRow["priority"], weight: "1", resultNote: "" });
  const [reason, setReason] = useState("");
  const [delay, setDelay] = useState({ reason: DELAY_REASONS[0] as string, reasonNote: "", cause: "", predictable: "بله", changeNote: "", stillWorth: "بله", nextAction: "", newDeadline: "", scopeChange: "" });
  const [deadline, setDeadline] = useState({ date: goal.deadline, reason: "", note: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function addTask() {
    const saved = await run("savePersonalTask", {
      goalId: goal.id,
      title: task.title,
      detail: task.detail,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimateHours: Number(task.estimateHours || 0),
      priority: task.priority,
      status: "todo",
      resultNote: task.resultNote,
      weight: Number(task.weight || 1),
    });
    if (saved) setTask({ ...task, title: "", detail: "", resultNote: "" });
  }

  return (
    <div className="grid gap-4">
      <button type="button" className="text-sm font-bold text-[#1C3D52]" onClick={onBack}>بازگشت</button>
      <article className="rounded-3xl border border-border bg-surface p-4">
        <h3 className="text-lg font-bold">{goal.title}</h3>
        <p className="mt-1 text-sm text-muted">{goal.category} · {KIND_LABEL[goal.kind]} · {STATUS_LABEL[goal.status]} · {percent}٪</p>
        <p className="mt-2 text-sm leading-7">نتیجه: {goal.outcome}</p>
        <p className="text-sm leading-7">معیار: {goal.successMetric}</p>
        <p className="mt-1 text-xs text-muted">مهلت اولیه {dayText(goal.originalDeadline)} · مهلت فعلی {dayText(goal.deadline)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>ویرایش</Button>
          {goal.status !== "done" ? <Button size="sm" disabled={busy} onClick={() => void run("personalGoalStatus", { id: goal.id, status: "done", reason: "تأیید تکمیل" })}>تکمیل شد</Button> : null}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("personalGoalArchive", { id: goal.id, archived: !goal.archived })}>{goal.archived ? "بازیابی" : "بایگانی"}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } void run("personalGoalDelete", { id: goal.id, confirm: true }); }}>
            {confirmDelete ? "حذف دائمی، مطمئنی؟" : "حذف"}
          </Button>
        </div>
      </article>

      <section className="grid gap-2">
        <h3 className="font-bold">وظیفه‌ها</h3>
        {tasks.map((row) => (
          <label key={row.id} className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={row.status === "done"} onChange={(e) => void run("togglePersonalTask", { id: row.id, done: e.target.checked })} />
            <span>
              <span className="font-bold">{row.title}</span>
              <span className="mt-1 block text-xs text-muted">وزن {row.weight} · {TASK_STATUS_LABEL[row.status]}{row.dueDate ? ` · تا ${dayText(row.dueDate)}` : ""}</span>
            </span>
          </label>
        ))}
        <div className="grid gap-2 rounded-2xl border border-border p-3">
          <Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="عنوان وظیفه" />
          <Textarea value={task.detail} onChange={(e) => setTask({ ...task, detail: e.target.value })} placeholder="توضیح کوتاه" />
          <JalaliDatePicker value={task.startDate} onChange={(startDate) => setTask({ ...task, startDate })} label="شروع وظیفه" />
          <JalaliDatePicker value={task.dueDate} onChange={(dueDate) => setTask({ ...task, dueDate })} label="موعد وظیفه" />
          <Input value={task.estimateHours} onChange={(e) => setTask({ ...task, estimateHours: e.target.value.replace(/[^\d.]/g, "") })} placeholder="زمان تخمینی، ساعت" />
          <NativeSelect value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value as TaskRow["priority"] })}>
            <option value="high">اولویت زیاد</option>
            <option value="medium">اولویت متوسط</option>
            <option value="low">اولویت کم</option>
          </NativeSelect>
          <NativeSelect value={task.weight} onChange={(e) => setTask({ ...task, weight: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>وزن {n}</option>)}
          </NativeSelect>
          <Input value={task.resultNote} onChange={(e) => setTask({ ...task, resultNote: e.target.value })} placeholder="نتیجه یا توضیح اجرا" />
          <Button type="button" disabled={busy} onClick={() => void addTask()}>افزودن وظیفه</Button>
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl border border-border p-3">
        <h3 className="font-bold">تصمیم</h3>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت توقف، تعویق یا لغو" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("personalGoalStatus", { id: goal.id, status: "paused", reason })}>توقف</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("personalGoalStatus", { id: goal.id, status: "postponed", reason })}>تعویق</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("personalGoalStatus", { id: goal.id, status: "cancelled", reason })}>لغو</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("personalGoalStatus", { id: goal.id, status: "active", reason: "" })}>ادامه</Button>
        </div>
      </section>

      <DelayForm goalId={goal.id} delay={delay} setDelay={setDelay} busy={busy} onSave={() => void run("savePersonalDelay", { goalId: goal.id, ...delay })} />

      <section className="grid gap-2 rounded-2xl border border-border p-3">
        <h3 className="font-bold">تغییر مهلت</h3>
        <p className="text-xs text-muted">مهلت اولیه پاک نمی‌شود. این تغییر پیشرفت حساب نمی‌شود.</p>
        <JalaliDatePicker value={deadline.date} onChange={(date) => setDeadline({ ...deadline, date })} label="مهلت جدید" />
        <Input value={deadline.reason} onChange={(e) => setDeadline({ ...deadline, reason: e.target.value })} placeholder="علت تغییر" />
        <Textarea value={deadline.note} onChange={(e) => setDeadline({ ...deadline, note: e.target.value })} placeholder="توضیح تصمیم" />
        <Button type="button" disabled={busy} onClick={() => void run("changePersonalDeadline", { goalId: goal.id, deadline: deadline.date, reason: deadline.reason, note: deadline.note })}>ثبت مهلت جدید</Button>
        {changes.map((row) => (
          <p key={row.id} className="text-xs leading-6 text-muted">{dayText(row.previousDeadline)} به {dayText(row.nextDeadline)} · {row.reason}</p>
        ))}
      </section>

      {reviews.length ? (
        <section>
          <h3 className="font-bold">تاریخچه بررسی تأخیر</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {reviews.map((row) => <li key={row.id} className="rounded-xl bg-surface p-3">{row.reason} — {row.cause}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function DelayForm({
  delay, setDelay, busy, onSave,
}: {
  goalId: string;
  delay: { reason: string; reasonNote: string; cause: string; predictable: string; changeNote: string; stillWorth: string; nextAction: string; newDeadline: string; scopeChange: string };
  setDelay: (value: { reason: string; reasonNote: string; cause: string; predictable: string; changeNote: string; stillWorth: string; nextAction: string; newDeadline: string; scopeChange: string }) => void;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <section className="grid gap-2 rounded-2xl border border-border p-3">
      <h3 className="font-bold">بررسی نرسیدن به موعد</h3>
      <p className="text-xs leading-6 text-muted">گذشتن تاریخ، هدف را شکست‌خورده یا تمام‌شده نمی‌کند.</p>
      <NativeSelect value={delay.reason} onChange={(e) => setDelay({ ...delay, reason: e.target.value })}>
        {DELAY_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </NativeSelect>
      {delay.reason === "سایر موارد" ? <Textarea value={delay.reasonNote} onChange={(e) => setDelay({ ...delay, reasonNote: e.target.value })} placeholder="توضیح شخصی" /> : null}
      <Textarea value={delay.cause} onChange={(e) => setDelay({ ...delay, cause: e.target.value })} placeholder="علت اصلی چه بود؟" />
      <Input value={delay.predictable} onChange={(e) => setDelay({ ...delay, predictable: e.target.value })} placeholder="آیا قابل پیش‌بینی بود؟" />
      <Textarea value={delay.changeNote} onChange={(e) => setDelay({ ...delay, changeNote: e.target.value })} placeholder="چه چیزی باید تغییر کند؟" />
      <Input value={delay.stillWorth} onChange={(e) => setDelay({ ...delay, stillWorth: e.target.value })} placeholder="آیا هنوز ارزش ادامه دارد؟" />
      <Input value={delay.nextAction} onChange={(e) => setDelay({ ...delay, nextAction: e.target.value })} placeholder="اقدام بعدی" />
      <JalaliDatePicker value={delay.newDeadline} onChange={(newDeadline) => setDelay({ ...delay, newDeadline })} label="مهلت جدید، اگر لازم است" />
      <Textarea value={delay.scopeChange} onChange={(e) => setDelay({ ...delay, scopeChange: e.target.value })} placeholder="تغییر حجم، روش یا اولویت" />
      <Button type="button" disabled={busy} onClick={onSave}>ثبت بررسی</Button>
    </section>
  );
}

function WeekPlan({ board, busy, run }: { board: Board; busy: boolean; run: (type: string, payload: unknown) => Promise<Board | null> }) {
  const days = useMemo(() => {
    const list: string[] = [];
    let cursor = board.weekStart;
    while (cursor <= board.weekEnd) {
      list.push(cursor);
      cursor = shiftKey(cursor, 1);
    }
    return list;
  }, [board.weekStart, board.weekEnd]);
  const goals = board.goals.filter((goal) => !goal.archived && goal.status !== "cancelled" && goal.status !== "done");
  const [draft, setDraft] = useState({ goalId: goals[0]?.id || "", title: "", dayKey: board.today, planned: "30", actual: "0" });
  const [review, setReview] = useState({ wentWell: board.weekReview?.wentWell || "", blocked: board.weekReview?.blocked || "", nextFocus: board.weekReview?.nextFocus || "" });
  const [moveDay, setMoveDay] = useState(board.today);
  const weekActions = board.actions.filter((action) => action.dayKey >= board.weekStart && action.dayKey <= board.weekEnd);
  const plannedMinutes = weekActions.reduce((sum, action) => sum + action.plannedMinutes, 0);
  const actualMinutes = weekActions.reduce((sum, action) => sum + action.actualMinutes, 0);
  const done = weekActions.filter((action) => action.done).length;
  const late = board.actions.filter((action) => action.dayKey < board.today && !action.done && !action.missed);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">{dayText(board.weekStart)} تا {dayText(board.weekEnd)}</p>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="برنامه‌ریزی‌شده" value={String(weekActions.length)} />
        <Stat label="انجام‌شده" value={String(done)} />
        <Stat label="ساعت برنامه" value={(plannedMinutes / 60).toFixed(1)} />
        <Stat label="ساعت واقعی" value={(actualMinutes / 60).toFixed(1)} />
      </div>
      {days.map((day) => {
        const rows = weekActions.filter((action) => action.dayKey === day);
        const note = board.notes.find((item) => item.dayKey === day)?.note || "";
        return (
          <section key={day} className="rounded-2xl border border-border p-3">
            <h3 className="font-bold">{day === board.today ? "امروز" : dayText(day)}</h3>
            {!rows.length ? <p className="mt-1 text-xs text-muted">اقدامی نیست.</p> : rows.map((action) => (
              <div key={action.id} className="mt-2 grid gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={action.done} onChange={(e) => void run("savePersonalAction", { ...action, taskId: action.taskId, done: e.target.checked, missed: e.target.checked ? false : action.missed })} />
                  <span>{action.title}</span>
                </label>
                <div className="flex gap-2">
                  <Input value={String(action.actualMinutes)} onChange={(e) => void run("savePersonalAction", { ...action, taskId: action.taskId, actualMinutes: Number(e.target.value.replace(/[^\d]/g, "") || 0) })} placeholder="دقیقه واقعی" />
                  <Button size="sm" variant="outline" type="button" onClick={() => void run("movePersonalAction", { id: action.id, dayKey: moveDay })}>انتقال</Button>
                </div>
              </div>
            ))}
            <DayNote dayKey={day} note={note} busy={busy} run={run} />
          </section>
        );
      })}
      {late.length ? (
        <section>
          <h3 className="font-bold">عقب‌افتاده</h3>
          {late.map((action) => <p key={action.id} className="mt-1 text-sm">{action.title} · {dayText(action.dayKey)}</p>)}
        </section>
      ) : null}
      <section className="grid gap-2 rounded-2xl border border-border p-3">
        <h3 className="font-bold">اقدام تازه</h3>
        <NativeSelect value={draft.goalId} onChange={(e) => setDraft({ ...draft, goalId: e.target.value })}>
          {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </NativeSelect>
        <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="اقدام این روز" />
        <JalaliDatePicker value={draft.dayKey} onChange={(dayKey) => setDraft({ ...draft, dayKey })} label="روز" />
        <Input value={draft.planned} onChange={(e) => setDraft({ ...draft, planned: e.target.value.replace(/[^\d]/g, "") })} placeholder="دقیقه مورد انتظار" />
        <Button type="button" disabled={busy || !draft.goalId} onClick={() => void run("savePersonalAction", { goalId: draft.goalId, dayKey: draft.dayKey, title: draft.title, plannedMinutes: Number(draft.planned || 0), actualMinutes: 0, done: false, missed: false, note: "" })}>ثبت اقدام</Button>
        <p className="text-xs text-muted">روز انتقال را انتخاب کن، بعد کنار همان اقدام «انتقال» را بزن.</p>
        <JalaliDatePicker value={moveDay} onChange={setMoveDay} label="روز انتقال" />
      </section>
      <section className="grid gap-2 rounded-2xl border border-[#1C3D52]/15 bg-[#F4EFE6] p-3">
        <h3 className="font-bold">مرور این هفته</h3>
        <p className="text-sm">قرار بود {weekActions.length} کار انجام شود. {done} تا انجام شد.</p>
        <p className="text-sm">برنامه {(plannedMinutes / 60).toFixed(1)} ساعت، صرف‌شده {(actualMinutes / 60).toFixed(1)} ساعت.</p>
        <Textarea value={review.wentWell} onChange={(e) => setReview({ ...review, wentWell: e.target.value })} placeholder="چه چیزی خوب پیش رفت؟" />
        <Textarea value={review.blocked} onChange={(e) => setReview({ ...review, blocked: e.target.value })} placeholder="چه چیزی مانع شد؟" />
        <Input value={review.nextFocus} onChange={(e) => setReview({ ...review, nextFocus: e.target.value })} placeholder="مهم‌ترین اقدام هفته بعد" />
        <Button type="button" disabled={busy} onClick={() => void run("savePersonalWeek", review)}>ذخیره مرور</Button>
        <p className="text-xs text-muted">هفته بعد از روی این یادداشت چیده می‌شود، نه با کپی خودکار این هفته.</p>
      </section>
    </div>
  );
}

function DayNote({ dayKey, note, busy, run }: { dayKey: string; note: string; busy: boolean; run: (type: string, payload: unknown) => Promise<Board | null> }) {
  const [text, setText] = useState(note);
  return (
    <div className="mt-2 flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="یادداشت نتیجه این روز" />
      <Button size="sm" variant="outline" disabled={busy} type="button" onClick={() => void run("savePersonalDayNote", { dayKey, note: text })}>ثبت</Button>
    </div>
  );
}

function Report({ board }: { board: Board }) {
  const goals = board.goals.filter((goal) => !goal.archived);
  const done = goals.filter((goal) => goal.status === "done");
  const onTime = done.filter((goal) => {
    if (!goal.completedAt) return false;
    const changed = board.deadlineChanges.some((row) => row.goalId === goal.id);
    return !changed && tehranDayKey(new Date(goal.completedAt)) <= goal.originalDeadline;
  });
  const extended = goals.filter((goal) => board.deadlineChanges.some((row) => row.goalId === goal.id));
  const unfinished = goals.filter((goal) => goal.status !== "done" && goal.status !== "cancelled" && goal.status !== "idea" && goal.status !== "waiting");
  const enough = done.length + extended.length + unfinished.length >= 3;
  const byCategory = new Map<string, { total: number; done: number }>();
  for (const goal of goals) {
    const row = byCategory.get(goal.category) ?? { total: 0, done: 0 };
    row.total += 1;
    if (goal.status === "done") row.done += 1;
    byCategory.set(goal.category, row);
  }
  const reasonCount = new Map<string, number>();
  for (const review of board.reviews) reasonCount.set(review.reason, (reasonCount.get(review.reason) ?? 0) + 1);
  const estimate = goals.reduce((sum, goal) => sum + goal.estimateHours, 0);
  const actual = board.actions.reduce((sum, action) => sum + action.actualMinutes, 0) / 60;
  const started = board.events.filter((event) => event.kind === "started").length;
  const weeks = new Map<string, { planned: number; done: number }>();
  for (const action of board.actions) {
    const key = weekStartOf(action.dayKey);
    const row = weeks.get(key) ?? { planned: 0, done: 0 };
    row.planned += 1;
    if (action.done) row.done += 1;
    weeks.set(key, row);
  }
  const best = [...weeks.entries()].sort((a, b) => (b[1].done / Math.max(1, b[1].planned)) - (a[1].done / Math.max(1, a[1].planned)))[0];
  return (
    <div className="grid gap-3 text-sm leading-7">
      <Stat label="تکمیل در مهلت اولیه" value={String(onTime.length)} />
      <Stat label="نیاز به تمدید" value={String(extended.length)} />
      <Stat label="نیمه‌کاره" value={String(unfinished.length)} />
      <p>{enough ? "این عددها از هدف‌های ذخیره‌شده همین حساب است." : "داده کافی نیست. با کمتر از سه هدف تمام‌شده، تمدیدشده یا نیمه‌کاره نتیجه‌گیری نمی‌شود."}</p>
      <h3 className="font-bold">دسته‌ها</h3>
      {[...byCategory.entries()].map(([label, row]) => <p key={label}>{label}: {row.done} از {row.total}</p>)}
      {byCategory.size < 2 ? <p>داده کافی نیست تا گفته شود کدام دسته بهتر است.</p> : null}
      <h3 className="font-bold">علت‌های تأخیر</h3>
      {reasonCount.size ? [...reasonCount.entries()].map(([reason, count]) => <p key={reason}>{reason}: {count} بار</p>) : <p>داده کافی نیست.</p>}
      <h3 className="font-bold">زمان</h3>
      {actual > 0 ? <p>تخمین {estimate.toFixed(1)} ساعت، زمان واقعی ثبت‌شده {actual.toFixed(1)} ساعت. اختلاف {(actual - estimate).toFixed(1)} ساعت.</p> : <p>داده کافی نیست. هنوز زمان واقعی اقدامی ثبت نشده.</p>}
      <p>شروع هدف تازه وقتی هدف دیگری فعال بوده: {started} بار. {started < 2 ? "داده کافی نیست." : ""}</p>
      <h3 className="font-bold">هفته‌ها</h3>
      {weeks.size >= 2 && best ? <p>بهترین بازه از {dayText(best[0])} با {best[1].done} کار انجام‌شده از {best[1].planned}.</p> : <p>داده کافی نیست. حداقل دو هفته اقدام لازم است.</p>}
    </div>
  );
}
