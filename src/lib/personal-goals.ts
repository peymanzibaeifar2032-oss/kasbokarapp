export const GOAL_CATEGORIES = [
  "رشد شغلی و مهارت",
  "کسب‌وکار و درآمد",
  "پروژه‌های دیجیتال و فناوری",
  "رشد فردی و نظم شخصی",
  "خانواده و زندگی",
  "سلامت و تناسب‌اندام",
  "یادگیری",
  "سایر موارد",
] as const;

export const DELAY_REASONS = [
  "زمان موردنیاز را کمتر از واقع برآورد کردم.",
  "تعداد پروژه‌های فعالم بیش از حد بود.",
  "کارهای فوری و مسئولیت‌های زندگی مانع شدند.",
  "هدف یا وظایف آن به‌اندازه کافی واضح نبودند.",
  "مهارت یا اطلاعات کافی نداشتم.",
  "به منابع، بودجه یا ابزار موردنیاز دسترسی نداشتم.",
  "انگیزه یا انرژی من کمتر از انتظار بود.",
  "از انجام یک مرحله دشوار اجتناب کردم.",
  "در طول مسیر، اولویت‌ها تغییر کردند.",
  "هدف دیگر ارزش یا اهمیت قبلی را ندارد.",
  "یک مانع پیش‌بینی‌نشده رخ داد.",
  "سایر موارد",
] as const;

export type GoalKind = "main" | "side" | "support" | "routine";
export type GoalStatus = "idea" | "ready" | "active" | "waiting" | "paused" | "postponed" | "review" | "done" | "cancelled";
export type TaskStatus = "todo" | "doing" | "done" | "late" | "blocked";

export type GoalRow = {
  id: string;
  title: string;
  category: string;
  why: string;
  outcome: string;
  successMetric: string;
  startDate: string;
  deadline: string;
  originalDeadline: string;
  importance: "high" | "medium" | "low";
  kind: GoalKind;
  estimateHours: number;
  weeklyHours: number;
  status: GoalStatus;
  blockers: string;
  firstAction: string;
  postponeCount: number;
  archived: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  goalId: string;
  title: string;
  detail: string;
  startDate: string;
  dueDate: string;
  estimateHours: number;
  priority: "high" | "medium" | "low";
  status: TaskStatus;
  resultNote: string;
  weight: number;
  sortOrder: number;
};

export type ActionRow = {
  id: string;
  goalId: string;
  taskId: string;
  dayKey: string;
  title: string;
  plannedMinutes: number;
  actualMinutes: number;
  done: boolean;
  missed: boolean;
  note: string;
};

export type DelayReview = {
  id: string;
  goalId: string;
  taskId: string;
  reason: string;
  reasonNote: string;
  cause: string;
  predictable: string;
  changeNote: string;
  stillWorth: string;
  nextAction: string;
  newDeadline: string;
  scopeChange: string;
  createdAt: string;
};

export type DeadlineChange = {
  id: string;
  goalId: string;
  previousDeadline: string;
  nextDeadline: string;
  reason: string;
  note: string;
  createdAt: string;
};

export type GoalEvent = {
  id: string;
  goalId: string;
  kind: string;
  note: string;
  createdAt: string;
};

export const KIND_LABEL: Record<GoalKind, string> = {
  main: "اصلی",
  side: "فرعی",
  support: "پروژه پشتیبان",
  routine: "کار روزمره",
};

export const STATUS_LABEL: Record<GoalStatus, string> = {
  idea: "ایده",
  ready: "آماده شروع",
  active: "در حال اجرا",
  waiting: "فهرست انتظار",
  paused: "متوقف",
  postponed: "به تعویق افتاده",
  review: "نیازمند بررسی",
  done: "تکمیل شده",
  cancelled: "لغو شده",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "انجام نشده",
  doing: "در حال انجام",
  done: "انجام شده",
  late: "عقب‌افتاده",
  blocked: "مسدودشده",
};

export function goalProgress(tasks: TaskRow[]) {
  const live = tasks.filter((task) => task.weight > 0);
  const total = live.reduce((sum, task) => sum + task.weight, 0);
  if (!total) return 0;
  const done = live.filter((task) => task.status === "done").reduce((sum, task) => sum + task.weight, 0);
  return Math.round((done / total) * 100);
}

export function countsAsFocus(goal: GoalRow, today: string) {
  if (goal.archived || goal.kind === "routine") return false;
  if (goal.status !== "active") return false;
  const horizon = shiftKey(today, 90);
  return goal.startDate <= horizon && goal.deadline >= today;
}

export function shiftKey(dayKey: string, days: number) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function focusBlockers(goals: GoalRow[], candidate: { id?: string; kind: GoalKind; status: GoalStatus; startDate: string; deadline: string }, today: string) {
  if (candidate.status !== "active" || candidate.kind === "routine" || candidate.kind === "support") return [];
  const horizon = shiftKey(today, 90);
  if (candidate.startDate > horizon || candidate.deadline < today) return [];
  const limit = candidate.kind === "main" ? 1 : 2;
  const same = goals.filter(
    (goal) =>
      goal.id !== candidate.id &&
      goal.kind === candidate.kind &&
      countsAsFocus(goal, today),
  );
  return same.length >= limit ? same : [];
}
