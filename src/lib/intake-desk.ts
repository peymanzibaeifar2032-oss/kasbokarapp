import { isIranMobile, normalizeIranPhone, toEnDigits } from "./format.ts";
import { TATTOO_BODY_PARTS, TATTOO_REQUEST_LABEL, TATTOO_SIDES, TATTOO_SIZE_LABELS } from "./tattoo-estimate.ts";
import { answerStudioQuestion } from "./tattoo-assistant.ts";

export type IntakeStep = "questions" | "name" | "phone" | "type" | "part" | "side" | "size" | "design" | "body" | "confirm";

export type IntakeDraft = {
  step: IntakeStep;
  fixing: boolean;
  name: string;
  phone: string;
  requestType: string;
  part: string;
  side: string;
  width: string;
  height: string;
  sizeLabel: string;
  imageDesign: boolean;
  imageCurrent: boolean;
};

export type IntakeChip = { id: string; label: string };

export type IntakeTurn = {
  draft: IntakeDraft;
  say: string[];
  chips: IntakeChip[];
  image: false | "reference" | "current";
  payload: IntakePayload | null;
  needsModel?: boolean;
  modelQuestion?: string;
  after?: string;
};

export type IntakePayload = {
  customerName: string;
  customerPhone: string;
  requestType: string;
  style: string;
  styles: string[];
  idea: string;
  placement: string;
  sizeCm: string;
  sizeMode: string;
  colorMode: string;
  bodySide: string;
};

const ORDER: IntakeStep[] = ["name", "phone", "type", "part", "side", "size", "design", "body", "confirm"];

const TYPES = [
  ["new", "تاتوی جدید"],
  ["coverup", "کاور"],
  ["consultation", "مشاوره"],
  ["repair", "ترمیم"],
  ["continuation", "تکمیل کار قبلی"],
  ["custom", "طراحی اختصاصی"],
] as const;

export function startIntake(): IntakeTurn {
  return speak(blank(), [
    "پاسخ سریع درخواست.",
    "اگر سؤالی درباره تاتو داری همین حالا بپرس. هر سؤالی.",
    "وقتی سؤال‌هایت تمام شد بنویس درخواست، تا فرم را با هم کامل کنیم.",
  ]);
}

export function answerIntake(draft: IntakeDraft, raw: string, images?: { design?: boolean; current?: boolean }): IntakeTurn {
  const text = raw.replace(/\s+/g, " ").trim();
  const next = {
    ...draft,
    imageDesign: images?.design ?? draft.imageDesign,
    imageCurrent: images?.current ?? draft.imageCurrent,
  };
  if (!text) return speak(next, ["جواب را بنویس، یا اگر سؤال داری بپرس."]);
  if (next.step === "questions" && isDoneAsking(text)) {
    return speak({ ...next, step: "name" }, [
      "باشه. حالا درخواست را کامل می‌کنیم. فقط نوع کار، جای بدن، اندازه و عکس طرح لازم است.",
      "اسمت چیست؟",
    ]);
  }
  if (next.step === "questions" || (looksLikeTalk(text) && !text.startsWith("pick:") && text !== "فرستادم" && !(next.step === "phone" && isIranMobile(normalizeIranPhone(text))))) {
    const hinted = mentionedPart(text);
    const remembered = hinted ? { ...next, part: next.part || hinted } : next;
    const turn = speak(remembered, []);
    return {
      ...turn,
      needsModel: true,
      modelQuestion: text,
      after: remembered.step === "questions" ? "سؤال دیگری داری؟ اگر نه، بنویس درخواست." : remembered.step === "confirm" ? "اگر خلاصه درست است بنویس بله." : question(remembered),
    };
  }
  if (next.step === "confirm") return confirm(next, text);
  const checked = check(next, text);
  if (checked.error) return speak(checked.draft, [checked.error]);
  const filled = checked.draft;
  if (filled.fixing) return showConfirm({ ...filled, fixing: false });
  return ask(filled, stepAfter(filled));
}

function check(draft: IntakeDraft, text: string): { draft: IntakeDraft; error: string } {
  const id = text.startsWith("pick:") ? text.slice(5) : "";
  if (draft.step === "name") {
    const name = text.replace(/^pick:/, "").trim();
    if (name.length < 5 || !/[\u0600-\u06FF]/.test(name) || /\d/.test(toEnDigits(name)) || looksLikeTalk(name)) {
      return { draft, error: "این اسم نیست. اسم و نام خانوادگی‌ات را بنویس. اگر سؤال داری همان را بپرس." };
    }
    return { draft: { ...draft, name }, error: "" };
  }
  if (draft.step === "phone") {
    const phone = normalizeIranPhone(text);
    if (!isIranMobile(phone)) return { draft, error: "شماره تماس واردشده صحیح نیست." };
    return { draft: { ...draft, phone }, error: "" };
  }
  if (draft.step === "type") {
    const found = TYPES.find((item) => item[0] === id || text.includes(item[1]));
    if (!found) return { draft, error: "نوع کار را انتخاب کن: تاتوی جدید، کاور، یا مشاوره." };
    return { draft: { ...draft, requestType: found[0] }, error: "" };
  }
  if (draft.step === "part") {
    if (draft.part && /^(بله|آره|اره|همان|همون|درسته)/.test(text)) return { draft, error: "" };
    const found = TATTOO_BODY_PARTS.find((item) => item !== "سایر" && (id === item || text.includes(item)));
    if (!found) return { draft, error: "محل اجرا را از گزینه‌ها انتخاب کن." };
    return { draft: { ...draft, part: found }, error: "" };
  }
  if (draft.step === "side") {
    const found = TATTOO_SIDES.find((item) => item[0] === id || text.includes(item[1]));
    if (!found) return { draft, error: "بگو راست است، چپ است، یا وسط." };
    return { draft: { ...draft, side: found[0] }, error: "" };
  }
  if (draft.step === "size") {
    const exact = parseSize(text);
    if (exact) return { draft: { ...draft, width: exact.width, height: exact.height, sizeLabel: "" }, error: "" };
    const approx = TATTOO_SIZE_LABELS.find((item) => item[0] === id || text.includes(item[1]));
    if (approx) return { draft: { ...draft, width: "", height: "", sizeLabel: approx[0] }, error: "" };
    return { draft, error: "اندازه را دقیق بگو، مثل ۱۰ در ۱۵، یا یکی از اندازه‌های تقریبی را انتخاب کن." };
  }
  if (draft.step === "design") {
    const optional = draft.requestType === "consultation";
    if (isSkip(text) && optional) return { draft, error: "" };
    if (!draft.imageDesign) return { draft, error: "عکس خود طرح را بفرست تا قیمت دقیق‌تر شود." };
    return { draft, error: "" };
  }
  if (draft.step === "body") {
    if (!draft.imageCurrent) return { draft, error: "عکس تاتویی که الان روی بدن است را بفرست." };
    return { draft, error: "" };
  }
  return { draft, error: "این را نفهمیدم. اگر سؤال داری بپرس." };
}

function confirm(draft: IntakeDraft, text: string): IntakeTurn {
  if (/^(بله|آره|اره|درست است|درسته|تأیید|تایید|بفرست)/.test(text) || text === "pick:yes") {
    return { ...showConfirm(draft), payload: toPayload(draft) };
  }
  const fix = ORDER.find((step) => text === `pick:fix:${step}` && (step !== "body" || needsBody(draft)));
  if (fix && fix !== "confirm") return ask({ ...draft, fixing: true }, fix);
  const faq = secretaryAnswer(text);
  if (faq) return speak(draft, [faq, "اگر خلاصه درست است بنویس بله."]);
  return speak(draft, ["اگر خلاصه درست است بنویس بله. اگر نه، همان مورد را اصلاح کن."]);
}

function secretaryAnswer(text: string) {
  return answerStudioQuestion(text);
}

function isDoneAsking(text: string) {
  return text === "pick:form" || /^(نه|ندارم|سوال ندارم|سؤالی ندارم|سؤال ندارم|درخواست|فرم|شروع|تمام|بس است|بسه|دیگه نه|دیگر نه)$/.test(text);
}

function looksLikeTalk(text: string) {
  return /[؟?]|امکان|میخوام|می‌خوام|میخاست|می‌خواست|میشه|می‌شه|میتون|می‌تون|بزنم|بزنه|تاتو|چطور|چجوری|چرا|آیا|لطفا/.test(text);
}

function mentionedPart(text: string) {
  const cleaned = text.replace(/درخواست/g, "");
  const found = [
    [/گردن/, "گردن"],
    [/ساعد/, "ساعد"],
    [/بازو/, "بازو"],
    [/انگشت/, "انگشت"],
    [/سینه/, "سینه"],
    [/شکم/, "شکم"],
    [/پهلو/, "پهلو"],
    [/پشت|کمر/, "پشت"],
    [/زانو/, "زانو"],
    [/ساق/, "ساق"],
    [/ران/, "ران"],
    [/مچ/, "مچ"],
    [/پا(?!ر)/, "پا"],
    [/دست/, "دست"],
    [/سر(?!یع)/, "سر"],
  ].find(([pattern]) => (pattern as RegExp).test(cleaned));
  return found ? String(found[1]) : "";
}

function ask(draft: IntakeDraft, step: IntakeStep): IntakeTurn {
  const next = { ...draft, step };
  return step === "confirm" ? showConfirm(next) : speak(next, [question(next)]);
}

function showConfirm(draft: IntakeDraft): IntakeTurn {
  const ready = { ...draft, step: "confirm" as const, fixing: false };
  return speak(ready, ["این را بخوان. اگر درست است بنویس بله.", summary(ready)]);
}

function speak(draft: IntakeDraft, say: string[]): IntakeTurn {
  const image = draft.step === "design" ? "reference" : draft.step === "body" ? "current" : false;
  return { draft, say, chips: chipsFor(draft), image, payload: null };
}

function question(draft: IntakeDraft) {
  const again = draft.fixing ? "این مورد را اصلاح کن. " : "";
  if (draft.step === "phone") return `${again}شماره موبایل را بنویس.`;
  if (draft.step === "type") return `${again}کارت جدید است، کاور است، یا مشاوره؟`;
  if (draft.step === "part" && draft.part) return `${again}گفتی ${draft.part}. همان جا باشد؟`;
  if (draft.step === "side") return `${again}${draft.part} راست است یا چپ؟`;
  if (draft.step === "size") return `${again}اندازه را بگو. دقیق، مثل ۱۰ در ۱۵، یا تقریبی.`;
  if (draft.step === "design") {
    return draft.requestType === "consultation"
      ? `${again}اگر عکس طرح داری بفرست. اگر نداری بنویس ندارم.`
      : `${again}عکس خود طرح را بفرست.`;
  }
  if (draft.step === "body") return `${again}عکس تاتویی که الان روی بدن است را بفرست.`;
  return `${again}اسمت چیست؟`;
}

function chipsFor(draft: IntakeDraft): IntakeChip[] {
  if (draft.step === "questions") return [{ id: "form", label: "سؤال ندارم، درخواست را شروع کن" }];
  if (draft.step === "type") return TYPES.map(([id, label]) => ({ id, label }));
  if (draft.step === "part") return TATTOO_BODY_PARTS.filter((item) => item !== "سایر").map((item) => ({ id: item, label: item }));
  if (draft.step === "side") return TATTOO_SIDES.map(([id, label]) => ({ id, label }));
  if (draft.step === "size") return TATTOO_SIZE_LABELS.map(([id, label]) => ({ id, label: `${label}، تقریبی` }));
  if (draft.step === "design" && draft.requestType === "consultation") return [{ id: "skip", label: "عکس ندارم" }];
  if (draft.step === "confirm") {
    const fixes = ORDER.filter((step) => step !== "confirm" && (step !== "body" || needsBody(draft)));
    return [{ id: "yes", label: "درست است، بفرست" }, ...fixes.map((step) => ({ id: `fix:${step}`, label: fixLabel(step) }))];
  }
  return [];
}

function summary(draft: IntakeDraft) {
  const side = TATTOO_SIDES.find((item) => item[0] === draft.side)?.[1] || "";
  return [
    `نام: ${draft.name}`,
    `شماره: ${draft.phone}`,
    `نوع: ${TATTOO_REQUEST_LABEL[draft.requestType] || ""}`,
    `محل: ${draft.part} ${side}`,
    `اندازه: ${sizeText(draft)}`,
    `عکس طرح: ${draft.imageDesign ? "دارد" : "ندارد"}`,
    needsBody(draft) ? `عکس تاتوی فعلی: ${draft.imageCurrent ? "دارد" : "ندارد"}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toPayload(draft: IntakeDraft): IntakePayload {
  const side = TATTOO_SIDES.find((item) => item[0] === draft.side)?.[1] || "";
  const size = sizeText(draft);
  return {
    customerName: draft.name,
    customerPhone: draft.phone,
    requestType: draft.requestType,
    style: "از روی عکس",
    styles: ["other"],
    idea: [`درخواست از پاسخ سریع`, `نوع: ${TATTOO_REQUEST_LABEL[draft.requestType] || draft.requestType}`, `محل: ${draft.part}، ${side}`, `اندازه: ${size}`].join("\n"),
    placement: `${draft.part}، ${side}`,
    sizeCm: size,
    sizeMode: draft.sizeLabel ? "approx" : "cm",
    colorMode: "",
    bodySide: draft.side,
  };
}

function sizeText(draft: IntakeDraft) {
  if (draft.sizeLabel) {
    const label = TATTOO_SIZE_LABELS.find((item) => item[0] === draft.sizeLabel)?.[1] || draft.sizeLabel;
    return `${label}، تقریبی`;
  }
  return `${draft.width}×${draft.height} سانتی‌متر`;
}

function blank(): IntakeDraft {
  return {
    step: "questions",
    fixing: false,
    name: "",
    phone: "",
    requestType: "",
    part: "",
    side: "",
    width: "",
    height: "",
    sizeLabel: "",
    imageDesign: false,
    imageCurrent: false,
  };
}

function stepAfter(draft: IntakeDraft): IntakeStep {
  const index = ORDER.indexOf(draft.step);
  let next = ORDER[index + 1] || "confirm";
  if (next === "body" && !needsBody(draft)) next = "confirm";
  return next;
}

function needsBody(draft: IntakeDraft) {
  return draft.requestType === "coverup" || draft.requestType === "repair";
}

function isSkip(text: string) {
  return text === "pick:skip" || /^(ندارم|نه|خیر|عکس ندارم)$/.test(text);
}

function parseSize(raw: string) {
  const text = toEnDigits(raw);
  const match = text.match(/(\d{1,2}(?:\.\d+)?)\s*(?:در|x|×|\*|به)\s*(\d{1,2}(?:\.\d+)?)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || width > 60 || height < 1 || height > 60) return null;
  return { width: String(width), height: String(height) };
}

function fixLabel(step: IntakeStep) {
  const labels: Record<IntakeStep, string> = {
    questions: "سؤال",
    name: "اصلاح نام",
    phone: "اصلاح شماره",
    type: "اصلاح نوع",
    part: "اصلاح محل",
    side: "اصلاح سمت",
    size: "اصلاح اندازه",
    design: "اصلاح عکس طرح",
    body: "اصلاح عکس بدن",
    confirm: "تأیید",
  };
  return labels[step];
}
