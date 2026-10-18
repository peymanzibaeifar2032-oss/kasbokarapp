import { z } from "zod";
import { getSql } from "@/lib/db";
import { tehranDayKey, tehranWeekBounds } from "@/lib/hours";
import {
  DELAY_REASONS,
  GOAL_CATEGORIES,
  focusBlockers,
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

const kindSchema = z.enum(["main", "side", "support", "routine"]);
const statusSchema = z.enum(["idea", "ready", "active", "waiting", "paused", "postponed", "review", "done", "cancelled"]);
const taskStatusSchema = z.enum(["todo", "doing", "done", "late", "blocked"]);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function id() {
  return crypto.randomUUID();
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

type Sql = Awaited<ReturnType<typeof getSql>>;

async function event(sql: Sql, userId: string, goalId: string | null, kind: string, note: string) {
  await sql.query(
    "insert into personal_goal_events (id, user_id, goal_id, kind, note) values ($1,$2,$3,$4,$5)",
    [id(), userId, goalId, kind, note.slice(0, 500)],
  );
}

function mapGoal(row: Record<string, unknown>): GoalRow {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    why: String(row.why ?? ""),
    outcome: String(row.outcome ?? ""),
    successMetric: String(row.success_metric ?? ""),
    startDate: String(row.start_date),
    deadline: String(row.deadline),
    originalDeadline: String(row.original_deadline),
    importance: (row.importance as GoalRow["importance"]) || "medium",
    kind: row.kind as GoalKind,
    estimateHours: num(row.estimate_hours),
    weeklyHours: num(row.weekly_hours),
    status: row.status as GoalStatus,
    blockers: String(row.blockers ?? ""),
    firstAction: String(row.first_action ?? ""),
    postponeCount: num(row.postpone_count),
    archived: Boolean(row.archived),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTask(row: Record<string, unknown>): TaskRow {
  return {
    id: String(row.id),
    goalId: String(row.goal_id),
    title: String(row.title),
    detail: String(row.detail ?? ""),
    startDate: String(row.start_date ?? ""),
    dueDate: String(row.due_date ?? ""),
    estimateHours: num(row.estimate_hours),
    priority: (row.priority as TaskRow["priority"]) || "medium",
    status: row.status as TaskStatus,
    resultNote: String(row.result_note ?? ""),
    weight: Math.max(1, num(row.weight) || 1),
    sortOrder: num(row.sort_order),
  };
}

async function loadGoals(sql: Sql, userId: string) {
  const rows = await sql.query<Record<string, unknown>>(
    "select * from personal_goals where user_id = $1 order by archived asc, deadline asc, created_at desc",
    [userId],
  );
  return rows.map(mapGoal);
}

export async function performPersonalGoalBoard(userId: string) {
  const sql = await getSql();
  const today = tehranDayKey();
  const week = tehranWeekBounds(0);
  const goals = await loadGoals(sql, userId);
  const tasks = (await sql.query<Record<string, unknown>>(
    "select * from personal_goal_tasks where user_id = $1 order by sort_order asc, created_at asc",
    [userId],
  )).map(mapTask);
  const actions = (await sql.query<Record<string, unknown>>(
    "select * from personal_goal_actions where user_id = $1 and day_key < $2 order by day_key asc, created_at asc",
    [userId, shiftKey(week.endKey, 0)],
  )).map((row): ActionRow => ({
    id: String(row.id),
    goalId: String(row.goal_id),
    taskId: String(row.task_id ?? ""),
    dayKey: String(row.day_key),
    title: String(row.title),
    plannedMinutes: num(row.planned_minutes),
    actualMinutes: num(row.actual_minutes),
    done: Boolean(row.done),
    missed: Boolean(row.missed),
    note: String(row.note ?? ""),
  }));
  const notes = await sql.query<{ day_key: string; note: string }>(
    "select day_key, note from personal_day_notes where user_id = $1 and day_key >= $2 and day_key < $3",
    [userId, shiftKey(week.startKey, -14), week.endKey],
  );
  const reviews = (await sql.query<Record<string, unknown>>(
    "select * from personal_delay_reviews where user_id = $1 order by created_at desc limit 80",
    [userId],
  )).map((row): DelayReview => ({
    id: String(row.id),
    goalId: String(row.goal_id),
    taskId: String(row.task_id ?? ""),
    reason: String(row.reason),
    reasonNote: String(row.reason_note ?? ""),
    cause: String(row.cause ?? ""),
    predictable: String(row.predictable ?? ""),
    changeNote: String(row.change_note ?? ""),
    stillWorth: String(row.still_worth ?? ""),
    nextAction: String(row.next_action ?? ""),
    newDeadline: String(row.new_deadline ?? ""),
    scopeChange: String(row.scope_change ?? ""),
    createdAt: String(row.created_at),
  }));
  const deadlineChanges = (await sql.query<Record<string, unknown>>(
    "select * from personal_deadline_changes where user_id = $1 order by created_at desc",
    [userId],
  )).map((row): DeadlineChange => ({
    id: String(row.id),
    goalId: String(row.goal_id),
    previousDeadline: String(row.previous_deadline),
    nextDeadline: String(row.next_deadline),
    reason: String(row.reason ?? ""),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
  }));
  const events = (await sql.query<Record<string, unknown>>(
    "select * from personal_goal_events where user_id = $1 order by created_at desc limit 20",
    [userId],
  )).map((row): GoalEvent => ({
    id: String(row.id),
    goalId: String(row.goal_id ?? ""),
    kind: String(row.kind),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
  }));
  const weekReviewRows = await sql.query<{ went_well: string; blocked: string; next_focus: string }>(
    "select went_well, blocked, next_focus from personal_week_reviews where user_id = $1 and week_start = $2",
    [userId, week.startKey],
  );
  const categories = await sql.query<{ id: string; label: string }>(
    "select id, label from personal_goal_categories where user_id = $1 order by label",
    [userId],
  );
  const open = goals.filter((goal) => !goal.archived);
  const active = open.filter((goal) => goal.status === "active");
  const weekActions = actions.filter((action) => action.dayKey >= week.startKey && action.dayKey < week.endKey);
  const planned = weekActions.length;
  const done = weekActions.filter((action) => action.done).length;
  const alerts: { kind: string; text: string; goalId: string }[] = [];
  for (const goal of active) {
    if (goal.deadline < today) alerts.push({ kind: "overdue", text: `«${goal.title}» از موعد گذشته و نیازمند بررسی است.`, goalId: goal.id });
    else if (goal.deadline <= shiftKey(today, 7)) alerts.push({ kind: "soon", text: `موعد «${goal.title}» نزدیک است.`, goalId: goal.id });
  }
  const lateTasks = tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== "done");
  if (lateTasks.length) alerts.push({ kind: "tasks", text: `${lateTasks.length} وظیفه از موعد گذشته هنوز انجام نشده.`, goalId: lateTasks[0]?.goalId ?? "" });
  const mains = active.filter((goal) => goal.kind === "main" && goal.deadline >= today && goal.startDate <= shiftKey(today, 90));
  const sides = active.filter((goal) => goal.kind === "side" && goal.deadline >= today && goal.startDate <= shiftKey(today, 90));
  if (mains.length > 1 || sides.length > 2) alerts.push({ kind: "focus", text: "تعداد هدف‌های فعال از حد تمرکز بیشتر است.", goalId: "" });
  const reasonCount = new Map<string, number>();
  for (const review of reviews) reasonCount.set(review.reason, (reasonCount.get(review.reason) ?? 0) + 1);
  for (const [reason, count] of reasonCount) {
    if (count >= 2) alerts.push({ kind: "repeat", text: `علت «${reason}» ${count} بار تکرار شده.`, goalId: "" });
  }
  const previousWeek = tehranWeekBounds(-1);
  const previousReview = await sql.query(
    "select week_start from personal_week_reviews where user_id = $1 and week_start = $2",
    [userId, previousWeek.startKey],
  );
  const previousActions = actions.filter((action) => action.dayKey >= previousWeek.startKey && action.dayKey < previousWeek.endKey);
  if (previousActions.length && !previousReview.length) alerts.push({ kind: "week", text: "مرور هفتهٔ قبل هنوز نوشته نشده.", goalId: "" });

  const progressByGoal = Object.fromEntries(open.map((goal) => [goal.id, goal.status === "done" ? 100 : goalProgress(tasks.filter((task) => task.goalId === goal.id))]));
  return {
    today,
    weekStart: week.startKey,
    weekEnd: shiftKey(week.endKey, -1),
    categories: [...GOAL_CATEGORIES.map((label) => ({ id: label, label })), ...categories],
    goals,
    tasks,
    actions,
    notes: notes.map((row) => ({ dayKey: row.day_key, note: row.note })),
    reviews,
    deadlineChanges,
    events,
    weekReview: weekReviewRows[0]
      ? { wentWell: weekReviewRows[0].went_well, blocked: weekReviewRows[0].blocked, nextFocus: weekReviewRows[0].next_focus }
      : null,
    alerts,
    counts: {
      active: active.length,
      done: open.filter((goal) => goal.status === "done").length,
      soon: alerts.filter((alert) => alert.kind === "soon").length,
      overdue: alerts.filter((alert) => alert.kind === "overdue").length,
      stalled: open.filter((goal) => goal.status === "paused" || goal.status === "postponed" || goal.status === "review").length,
      adherence: planned ? Math.round((done / planned) * 100) : null,
    },
    progressByGoal,
    reasons: DELAY_REASONS,
  };
}

const goalInput = z.object({
  id: z.string().max(80).optional(),
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  why: z.string().trim().min(2).max(2000),
  outcome: z.string().trim().min(2).max(2000),
  successMetric: z.string().trim().min(2).max(2000),
  startDate: dayKey,
  deadline: dayKey,
  importance: z.enum(["high", "medium", "low"]),
  kind: kindSchema,
  estimateHours: z.number().min(0).max(10000),
  weeklyHours: z.number().min(0).max(80),
  status: statusSchema,
  blockers: z.string().max(2000).default(""),
  firstAction: z.string().trim().min(2).max(500),
  resolve: z.object({ id: z.string().min(1), decision: z.enum(["pause", "postpone", "waiting"]) }).optional(),
});

export async function performSavePersonalGoal(userId: string, raw: unknown) {
  const data = goalInput.parse(raw);
  if (data.deadline < data.startDate) throw new Error("مهلت نهایی نباید قبل از تاریخ شروع باشد.");
  const sql = await getSql();
  const today = tehranDayKey();
  const goals = await loadGoals(sql, userId);
  const current = data.id ? goals.find((goal) => goal.id === data.id) : undefined;
  if (data.id && !current) throw new Error("این هدف پیدا نشد.");
  let status = data.status;
  const blockers = focusBlockers(goals, { id: data.id, kind: data.kind, status, startDate: data.startDate, deadline: data.deadline }, today);
  if (blockers.length) {
    if (!data.resolve) {
      return { needsDecision: true as const, blocking: blockers.map((goal) => ({ id: goal.id, title: goal.title, kind: goal.kind })) };
    }
    const target = blockers.find((goal) => goal.id === data.resolve?.id) ?? blockers[0];
    if (!target) throw new Error("هدف قبلی برای تصمیم پیدا نشد.");
    if (data.resolve.decision === "waiting") status = "waiting";
    else if (data.resolve.decision === "pause") {
      await sql.query("update personal_goals set status = 'paused', updated_at = now() where id = $1 and user_id = $2", [target.id, userId]);
      await event(sql, userId, target.id, "paused", "برای شروع هدف جدید متوقف شد.");
    } else {
      await sql.query("update personal_goals set status = 'postponed', postpone_count = postpone_count + 1, updated_at = now() where id = $1 and user_id = $2", [target.id, userId]);
      await event(sql, userId, target.id, "postponed", "برای شروع هدف جدید به تعویق افتاد.");
    }
  }
  if (![...GOAL_CATEGORIES].includes(data.category as (typeof GOAL_CATEGORIES)[number])) {
    await sql.query(
      "insert into personal_goal_categories (id, user_id, label) values ($1,$2,$3) on conflict (user_id, label) do nothing",
      [id(), userId, data.category],
    );
  }
  const completedAt = status === "done" ? new Date().toISOString() : null;
  if (current) {
    await sql.query(
      `update personal_goals set title=$1, category=$2, why=$3, outcome=$4, success_metric=$5, start_date=$6, deadline=$7,
       importance=$8, kind=$9, estimate_hours=$10, weekly_hours=$11, status=$12, blockers=$13, first_action=$14,
       completed_at=case when $12 = 'done' then coalesce(completed_at, now()) else null end, updated_at=now()
       where id=$15 and user_id=$16`,
      [data.title, data.category, data.why, data.outcome, data.successMetric, data.startDate, data.deadline, data.importance, data.kind, data.estimateHours, data.weeklyHours, status, data.blockers, data.firstAction, current.id, userId],
    );
    await event(sql, userId, current.id, "edited", data.title);
  } else {
    const goalId = id();
    await sql.query(
      `insert into personal_goals (id, user_id, title, category, why, outcome, success_metric, start_date, deadline, original_deadline, importance, kind, estimate_hours, weekly_hours, status, blockers, first_action, completed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [goalId, userId, data.title, data.category, data.why, data.outcome, data.successMetric, data.startDate, data.deadline, data.importance, data.kind, data.estimateHours, data.weeklyHours, status, data.blockers, data.firstAction, completedAt],
    );
    await event(sql, userId, goalId, status === "active" ? "started" : "created", data.title);
  }
  return performPersonalGoalBoard(userId);
}

export async function performPersonalGoalStatus(userId: string, raw: unknown) {
  const data = z.object({
    id: z.string().min(1),
    status: statusSchema,
    reason: z.string().max(500).default(""),
  }).parse(raw);
  const sql = await getSql();
  const goals = await loadGoals(sql, userId);
  const goal = goals.find((row) => row.id === data.id);
  if (!goal) throw new Error("این هدف پیدا نشد.");
  if (data.status === "active") {
    const blockers = focusBlockers(goals, { id: goal.id, kind: goal.kind, status: "active", startDate: goal.startDate, deadline: goal.deadline }, tehranDayKey());
    if (blockers.length) throw new Error("اول یکی از هدف‌های فعال را متوقف یا به تعویق بینداز.");
  }
  if ((data.status === "paused" || data.status === "cancelled" || data.status === "postponed") && data.reason.trim().length < 2) {
    throw new Error("علت این تصمیم را بنویس.");
  }
  await sql.query(
    `update personal_goals set status=$1,
     postpone_count = postpone_count + case when $1 = 'postponed' then 1 else 0 end,
     completed_at = case when $1 = 'done' then coalesce(completed_at, now()) when $1 = 'active' then null else completed_at end,
     updated_at=now() where id=$2 and user_id=$3`,
    [data.status, data.id, userId],
  );
  await event(sql, userId, data.id, data.status, data.reason || STATUS_NOTE[data.status]);
  return performPersonalGoalBoard(userId);
}

const STATUS_NOTE: Record<GoalStatus, string> = {
  idea: "به ایده برگشت.",
  ready: "آماده شروع شد.",
  active: "اجرا شروع شد.",
  waiting: "به فهرست انتظار رفت.",
  paused: "متوقف شد.",
  postponed: "به تعویق افتاد.",
  review: "برای بررسی علامت خورد.",
  done: "با تأیید مدیر تکمیل شد.",
  cancelled: "لغو شد.",
};

export async function performPersonalGoalArchive(userId: string, raw: unknown) {
  const data = z.object({ id: z.string().min(1), archived: z.boolean() }).parse(raw);
  const sql = await getSql();
  await sql.query("update personal_goals set archived=$1, updated_at=now() where id=$2 and user_id=$3", [data.archived, data.id, userId]);
  await event(sql, userId, data.id, data.archived ? "archived" : "restored", "");
  return performPersonalGoalBoard(userId);
}

export async function performPersonalGoalDelete(userId: string, raw: unknown) {
  const data = z.object({ id: z.string().min(1), confirm: z.literal(true) }).parse(raw);
  const sql = await getSql();
  await sql.query("delete from personal_goals where id=$1 and user_id=$2", [data.id, userId]);
  await event(sql, userId, null, "deleted", data.id);
  return performPersonalGoalBoard(userId);
}

const taskInput = z.object({
  id: z.string().max(80).optional(),
  goalId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  detail: z.string().max(1000).default(""),
  startDate: z.string().max(10).default(""),
  dueDate: z.string().max(10).default(""),
  estimateHours: z.number().min(0).max(1000).default(0),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: taskStatusSchema.default("todo"),
  resultNote: z.string().max(1000).default(""),
  weight: z.number().int().min(1).max(5).default(1),
});

export async function performSavePersonalTask(userId: string, raw: unknown) {
  const data = taskInput.parse(raw);
  const sql = await getSql();
  const owned = await sql.query("select id from personal_goals where id=$1 and user_id=$2", [data.goalId, userId]);
  if (!owned[0]) throw new Error("این هدف پیدا نشد.");
  if (data.id) {
    await sql.query(
      `update personal_goal_tasks set title=$1, detail=$2, start_date=$3, due_date=$4, estimate_hours=$5, priority=$6, status=$7, result_note=$8, weight=$9, updated_at=now()
       where id=$10 and user_id=$11`,
      [data.title, data.detail, data.startDate, data.dueDate, data.estimateHours, data.priority, data.status, data.resultNote, data.weight, data.id, userId],
    );
  } else {
    await sql.query(
      `insert into personal_goal_tasks (id, goal_id, user_id, title, detail, start_date, due_date, estimate_hours, priority, status, result_note, weight)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id(), data.goalId, userId, data.title, data.detail, data.startDate, data.dueDate, data.estimateHours, data.priority, data.status, data.resultNote, data.weight],
    );
  }
  return performPersonalGoalBoard(userId);
}

export async function performTogglePersonalTask(userId: string, raw: unknown) {
  const data = z.object({ id: z.string().min(1), done: z.boolean() }).parse(raw);
  const sql = await getSql();
  await sql.query(
    "update personal_goal_tasks set status=$1, updated_at=now() where id=$2 and user_id=$3",
    [data.done ? "done" : "todo", data.id, userId],
  );
  return performPersonalGoalBoard(userId);
}

const actionInput = z.object({
  id: z.string().max(80).optional(),
  goalId: z.string().min(1),
  taskId: z.string().max(80).default(""),
  dayKey,
  title: z.string().trim().min(2).max(180),
  plannedMinutes: z.number().int().min(0).max(24 * 60).default(0),
  actualMinutes: z.number().int().min(0).max(24 * 60).default(0),
  done: z.boolean().default(false),
  missed: z.boolean().default(false),
  note: z.string().max(500).default(""),
});

export async function performSavePersonalAction(userId: string, raw: unknown) {
  const data = actionInput.parse(raw);
  const sql = await getSql();
  const owned = await sql.query("select id from personal_goals where id=$1 and user_id=$2", [data.goalId, userId]);
  if (!owned[0]) throw new Error("این هدف پیدا نشد.");
  if (data.id) {
    await sql.query(
      `update personal_goal_actions set day_key=$1, title=$2, planned_minutes=$3, actual_minutes=$4, done=$5, missed=$6, note=$7
       where id=$8 and user_id=$9`,
      [data.dayKey, data.title, data.plannedMinutes, data.actualMinutes, data.done, data.missed, data.note, data.id, userId],
    );
  } else {
    await sql.query(
      `insert into personal_goal_actions (id, goal_id, task_id, user_id, day_key, title, planned_minutes, actual_minutes, done, missed, note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id(), data.goalId, data.taskId || null, userId, data.dayKey, data.title, data.plannedMinutes, data.actualMinutes, data.done, data.missed, data.note],
    );
  }
  return performPersonalGoalBoard(userId);
}

export async function performMovePersonalAction(userId: string, raw: unknown) {
  const data = z.object({ id: z.string().min(1), dayKey }).parse(raw);
  const sql = await getSql();
  await sql.query("update personal_goal_actions set day_key=$1 where id=$2 and user_id=$3", [data.dayKey, data.id, userId]);
  return performPersonalGoalBoard(userId);
}

export async function performSavePersonalDayNote(userId: string, raw: unknown) {
  const data = z.object({ dayKey, note: z.string().max(1000) }).parse(raw);
  const sql = await getSql();
  await sql.query(
    `insert into personal_day_notes (user_id, day_key, note) values ($1,$2,$3)
     on conflict (user_id, day_key) do update set note=excluded.note`,
    [userId, data.dayKey, data.note],
  );
  return performPersonalGoalBoard(userId);
}

export async function performSavePersonalDelay(userId: string, raw: unknown) {
  const data = z.object({
    goalId: z.string().min(1),
    taskId: z.string().max(80).default(""),
    reason: z.string().min(2).max(200),
    reasonNote: z.string().max(1000).default(""),
    cause: z.string().trim().min(2).max(1000),
    predictable: z.string().trim().min(1).max(200),
    changeNote: z.string().trim().min(2).max(1000),
    stillWorth: z.string().trim().min(1).max(200),
    nextAction: z.string().trim().min(2).max(500),
    newDeadline: z.string().max(10).default(""),
    scopeChange: z.string().max(1000).default(""),
  }).parse(raw);
  const sql = await getSql();
  const owned = await sql.query<{ deadline: string }>("select deadline from personal_goals where id=$1 and user_id=$2", [data.goalId, userId]);
  if (!owned[0]) throw new Error("این هدف پیدا نشد.");
  await sql.query(
    `insert into personal_delay_reviews (id, user_id, goal_id, task_id, reason, reason_note, cause, predictable, change_note, still_worth, next_action, new_deadline, scope_change)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id(), userId, data.goalId, data.taskId || null, data.reason, data.reasonNote, data.cause, data.predictable, data.changeNote, data.stillWorth, data.nextAction, data.newDeadline, data.scopeChange],
  );
  await sql.query("update personal_goals set status='review', updated_at=now() where id=$1 and user_id=$2 and status <> 'done'", [data.goalId, userId]);
  if (data.newDeadline && data.newDeadline !== owned[0].deadline) {
    await sql.query(
      "insert into personal_deadline_changes (id, user_id, goal_id, previous_deadline, next_deadline, reason, note) values ($1,$2,$3,$4,$5,$6,$7)",
      [id(), userId, data.goalId, owned[0].deadline, data.newDeadline, data.reason, data.cause],
    );
    await sql.query(
      "update personal_goals set deadline=$1, postpone_count=postpone_count+1, updated_at=now() where id=$2 and user_id=$3",
      [data.newDeadline, data.goalId, userId],
    );
  }
  await event(sql, userId, data.goalId, "reviewed", data.reason);
  return performPersonalGoalBoard(userId);
}

export async function performChangePersonalDeadline(userId: string, raw: unknown) {
  const data = z.object({
    goalId: z.string().min(1),
    deadline: dayKey,
    reason: z.string().trim().min(2).max(500),
    note: z.string().max(1000).default(""),
  }).parse(raw);
  const sql = await getSql();
  const owned = await sql.query<{ deadline: string }>("select deadline from personal_goals where id=$1 and user_id=$2", [data.goalId, userId]);
  if (!owned[0]) throw new Error("این هدف پیدا نشد.");
  if (data.deadline === owned[0].deadline) throw new Error("مهلت جدید با مهلت فعلی یکی است.");
  await sql.query(
    "insert into personal_deadline_changes (id, user_id, goal_id, previous_deadline, next_deadline, reason, note) values ($1,$2,$3,$4,$5,$6,$7)",
    [id(), userId, data.goalId, owned[0].deadline, data.deadline, data.reason, data.note],
  );
  await sql.query(
    "update personal_goals set deadline=$1, postpone_count=postpone_count+1, updated_at=now() where id=$2 and user_id=$3",
    [data.deadline, data.goalId, userId],
  );
  await event(sql, userId, data.goalId, "deadline", `${owned[0].deadline} → ${data.deadline}`);
  return performPersonalGoalBoard(userId);
}

export async function performSavePersonalWeek(userId: string, raw: unknown) {
  const data = z.object({
    wentWell: z.string().max(2000).default(""),
    blocked: z.string().max(2000).default(""),
    nextFocus: z.string().trim().min(2).max(500),
  }).parse(raw);
  const sql = await getSql();
  const week = tehranWeekBounds(0);
  await sql.query(
    `insert into personal_week_reviews (user_id, week_start, went_well, blocked, next_focus)
     values ($1,$2,$3,$4,$5)
     on conflict (user_id, week_start) do update set went_well=excluded.went_well, blocked=excluded.blocked, next_focus=excluded.next_focus`,
    [userId, week.startKey, data.wentWell, data.blocked, data.nextFocus],
  );
  await event(sql, userId, null, "week", data.nextFocus);
  return performPersonalGoalBoard(userId);
}
