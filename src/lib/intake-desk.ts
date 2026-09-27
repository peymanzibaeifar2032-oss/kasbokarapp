import { isIranMobile, normalizeInstagramHandle, normalizeIranPhone, toEnDigits } from "./format.ts";
import { TATTOO_BODY_PARTS, TATTOO_COLORS, TATTOO_REQUEST_LABEL, TATTOO_SIDES, TATTOO_STYLE_OPTIONS } from "./tattoo-estimate.ts";

export type IntakeStep =
  | "name"
  | "phone"
  | "phone2"
  | "instagram"
  | "type"
  | "part"
  | "side"
  | "size"
  | "style"
  | "color"
  | "idea"
  | "image"
  | "confirm";

export type IntakeDraft = {
  step: IntakeStep;
  fixing: boolean;
  name: string;
  phone: string;
  phone2: string;
  instagram: string;
  requestType: string;
  part: string;
  side: string;
  width: string;
  height: string;
  style: string;
  colorMode: string;
  idea: string;
  imageCount: number;
  hasCurrent: boolean;
};

export type IntakeChip = { id: string; label: string };

export type IntakeTurn = {
  draft: IntakeDraft;
  say: string[];
  chips: IntakeChip[];
  image: boolean;
  payload: IntakePayload | null;
};

export type IntakePayload = {
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  customerInstagram?: string;
  requestType: string;
  style: string;
  styles: string[];
  idea: string;
  placement: string;
  sizeCm: string;
  sizeMode: string;
  colorMode: string;
  bodySide: string;
  preferredDates?: string;
};

const ORDER: IntakeStep[] = ["name", "phone", "phone2", "instagram", "type", "part", "side", "size", "style", "color", "idea", "image", "confirm"];

const TYPES = [
  ["new", "تاتوی جدید"],
  ["custom", "طراحی اختصاصی"],
  ["coverup", "کاور تاتوی قبلی"],
  ["repair", "ترمیم"],
  ["continuation", "تکمیل تاتوی قبلی"],
  ["consultation", "مشاوره"],
] as const;

const VAGUE_IDEA = /^(طرح|یه طرح|یک طرح|تاتو|چیز|قشنگ|خوب|عالی|باحال|نمیدونم|نمی‌دانم|نمی دونم|هرچی|هر چی|نمیدانم|فقط تاتو)$/;

export function startIntake(): IntakeTurn {
  return speak(blank(), [
    "اینجا میز پذیرش است.",
    "سؤال‌ها را یکی‌یکی می‌پرسم. تا خواسته‌ات دقیق و تأیید نشده باشد، برای آرتیست فرستاده نمی‌شود. قیمت و روز را من تعیین نمی‌کنم.",
    "نام و نام خانوادگی‌ات چیست؟",
  ]);
}

export function answerIntake(draft: IntakeDraft, raw: string, images?: { count: number; hasCurrent: boolean }): IntakeTurn {
  const text = raw.replace(/\s+/g, " ").trim();
  const next = { ...draft, imageCount: images?.count ?? draft.imageCount, hasCurrent: images?.hasCurrent ?? draft.hasCurrent };
  if (!text) return speak(next, ["این قسمت را بنویس."]);
  if (next.step === "confirm") return confirm(next, text);
  const checked = check(next, text);
  if (checked.error) return speak(checked.draft, [checked.error]);
  const filled = checked.draft;
  if (filled.fixing) return showConfirm({ ...filled, fixing: false, step: "confirm" });
  return ask(filled, stepAfter(filled.step));
}

function check(draft: IntakeDraft, text: string): { draft: IntakeDraft; error: string } {
  const id = text.startsWith("pick:") ? text.slice(5) : "";
  if (draft.step === "name") {
    const name = text.replace(/^pick:/, "").trim();
    if (name.length < 5 || !/[\u0600-\u06FF]/.test(name) || /\d/.test(toEnDigits(name))) {
      return { draft, error: "نام و نام خانوادگی را کامل و فارسی بنویس." };
    }
    return { draft: { ...draft, name }, error: "" };
  }
  if (draft.step === "phone") {
    const phone = mobile(text);
    if (!phone) return { draft, error: "شماره تماس واردشده صحیح نیست. مثل ۰۹۱۲۰۰۰۰۰۰۰." };
    return { draft: { ...draft, phone }, error: "" };
  }
  if (draft.step === "phone2") {
    if (isSkip(text)) return { draft: { ...draft, phone2: "" }, error: "" };
    const phone = mobile(text);
    if (!phone) return { draft, error: "شماره دوم صحیح نیست. اگر نداری بنویس ندارم." };
    if (phone === draft.phone) return { draft, error: "این همان شماره اول است. شماره دیگری بده یا بنویس ندارم." };
    return { draft: { ...draft, phone2: phone }, error: "" };
  }
  if (draft.step === "instagram") {
    if (isSkip(text)) return { draft: { ...draft, instagram: "" }, error: "" };
    const handle = normalizeInstagramHandle(text);
    if (handle.length < 2) return { draft, error: "آیدی اینستاگرام را درست بنویس، یا بنویس ندارم." };
    return { draft: { ...draft, instagram: handle }, error: "" };
  }
  if (draft.step === "type") {
    const found = TYPES.find((item) => item[0] === id || item[1] === text || text.includes(item[1]));
    if (!found) return { draft, error: "نوع کار را از گزینه‌ها انتخاب کن." };
    return { draft: { ...draft, requestType: found[0] }, error: "" };
  }
  if (draft.step === "part") {
    const found = TATTOO_BODY_PARTS.find((item) => item !== "سایر" && (id === item || text === item || text.includes(item)));
    if (!found) return { draft, error: "محل را دقیق انتخاب کن. «بدن» یا «سایر» کافی نیست." };
    return { draft: { ...draft, part: found }, error: "" };
  }
  if (draft.step === "side") {
    const found = TATTOO_SIDES.find((item) => item[0] === id || item[1] === text || text.includes(item[1]));
    if (!found) return { draft, error: "راست، چپ یا وسط را انتخاب کن." };
    return { draft: { ...draft, side: found[0] }, error: "" };
  }
  if (draft.step === "size") {
    const size = parseSize(text);
    if (!size) return { draft, error: "طول و عرض را به سانتی‌متر بگو. مثلاً ۱۰ در ۱۵. اندازهٔ مبهم قبول نمی‌شود." };
    return { draft: { ...draft, width: size.width, height: size.height }, error: "" };
  }
  if (draft.step === "style") {
    const found = TATTOO_STYLE_OPTIONS.find((item) => item[0] !== "unknown" && item[0] !== "other" && (item[0] === id || item[1] === text || text.includes(item[1])));
    if (!found) return { draft, error: "یک سبک مشخص انتخاب کن. «نمی‌دانم» به صندوق نمی‌رود." };
    return { draft: { ...draft, style: found[0] }, error: "" };
  }
  if (draft.step === "color") {
    const found = TATTOO_COLORS.find((item) => item[0] !== "unsure" && (item[0] === id || item[1] === text || text.includes(item[1])));
    if (!found) return { draft, error: "رنگ کار را مشخص کن: سیاه و خاکستری، تمام‌رنگی، یا سیاه با یک رنگ." };
    return { draft: { ...draft, colorMode: found[0] }, error: "" };
  }
  if (draft.step === "idea") {
    const idea = text.trim();
    const compact = idea.replace(/\s/g, "");
    if (idea.split(" ").filter(Boolean).length < 3 || compact.length < 15 || VAGUE_IDEA.test(compact)) {
      return { draft, error: "خواسته را دقیق بنویس. موضوع طرح، نوشتهٔ داخلش، و چیزی که نباید باشد را بگو." };
    }
    return { draft: { ...draft, idea }, error: "" };
  }
  if (draft.step === "image") {
    const needsCurrent = draft.requestType === "coverup" || draft.requestType === "repair";
    if (isSkip(text)) {
      if (needsCurrent || draft.imageCount < 1 && needsCurrent) {
        return { draft, error: "برای کاور یا ترمیم، عکس تاتوی فعلی لازم است." };
      }
      return { draft, error: "" };
    }
    if (draft.imageCount < 1) return { draft, error: "اول عکس را بفرست، یا اگر عکس نداری بنویس ندارم." };
    if (needsCurrent && !draft.hasCurrent) return { draft, error: "عکس تاتوی فعلی را بفرست، نه فقط طرح مرجع." };
    return { draft, error: "" };
  }
  return { draft, error: "این جواب را نفهمیدم. دوباره همان سؤال را جواب بده." };
}

function confirm(draft: IntakeDraft, text: string): IntakeTurn {
  if (/^(بله|آره|اره|درست است|درسته|تأیید|تایید|بفرست)/.test(text) || text === "pick:yes") {
    return { ...showConfirm(draft), payload: toPayload(draft) };
  }
  const fix = ORDER.find((step) => text === `pick:fix:${step}`);
  if (fix && fix !== "confirm") {
    return ask({ ...draft, fixing: true }, fix);
  }
  return speak(draft, ["اگر خلاصه درست است بنویس بله. اگر نه، همان مورد را برای اصلاح انتخاب کن."]);
}

function ask(draft: IntakeDraft, step: IntakeStep): IntakeTurn {
  return show(step === "confirm" ? showConfirm(draft) : speak({ ...draft, step }, [question(step, draft)]));
}

function showConfirm(draft: IntakeDraft): IntakeTurn {
  const ready = { ...draft, step: "confirm" as const, fixing: false };
  return speak(ready, ["این خلاصه را بخوان. فقط اگر همه‌اش دقیق است بنویس بله.", summary(ready)]);
}

function show(turn: IntakeTurn): IntakeTurn {
  return turn;
}

function speak(draft: IntakeDraft, say: string[]): IntakeTurn {
  return { draft, say, chips: chipsFor(draft), image: draft.step === "image", payload: null };
}

function question(step: IntakeStep, draft: IntakeDraft) {
  const again = draft.fixing ? "این مورد را اصلاح کن. " : "";
  if (step === "phone") return `${again}شماره موبایل را بنویس.`;
  if (step === "phone2") return `${again}شماره دوم داری؟ اگر نه، بنویس ندارم.`;
  if (step === "instagram") return `${again}آیدی اینستاگرام را بنویس. اگر نداری، بنویس ندارم.`;
  if (step === "type") return `${again}کدام کار را می‌خواهی؟`;
  if (step === "part") return `${again}طرح دقیقاً روی کدام قسمت بدن است؟`;
  if (step === "side") return `${again}${draft.part} کدام سمت است؟`;
  if (step === "size") return `${again}طول و عرض را به سانتی‌متر بگو. مثلاً ۱۰ در ۱۵.`;
  if (step === "style") return `${again}سبک طرح کدام است؟ یکی را انتخاب کن.`;
  if (step === "color") return `${again}رنگ کار کدام است؟`;
  if (step === "idea") return `${again}خود طرح را دقیق بگو: موضوع، نوشته، و چیزی که نباید در کار باشد.`;
  if (step === "image") {
    return draft.requestType === "coverup" || draft.requestType === "repair"
      ? `${again}عکس واضح تاتوی فعلی را بفرست.`
      : `${again}اگر عکس طرح یا محل را داری بفرست. اگر نداری بنویس ندارم.`;
  }
  return `${again}نام و نام خانوادگی‌ات چیست؟`;
}

function chipsFor(draft: IntakeDraft): IntakeChip[] {
  if (draft.step === "phone2" || draft.step === "instagram") return [{ id: "skip", label: "ندارم" }];
  if (draft.step === "type") return TYPES.map(([id, label]) => ({ id, label }));
  if (draft.step === "part") return TATTOO_BODY_PARTS.filter((item) => item !== "سایر").map((item) => ({ id: item, label: item }));
  if (draft.step === "side") return TATTOO_SIDES.map(([id, label]) => ({ id, label }));
  if (draft.step === "style") return TATTOO_STYLE_OPTIONS.filter((item) => item[0] !== "unknown" && item[0] !== "other").map(([id, label]) => ({ id, label }));
  if (draft.step === "color") return TATTOO_COLORS.filter((item) => item[0] !== "unsure").map(([id, label]) => ({ id, label }));
  if (draft.step === "image" && draft.requestType !== "coverup" && draft.requestType !== "repair") return [{ id: "skip", label: "عکس ندارم" }];
  if (draft.step === "confirm") {
    return [
      { id: "yes", label: "درست است، بفرست" },
      ...ORDER.filter((step) => step !== "confirm").map((step) => ({ id: `fix:${step}`, label: fixLabel(step) })),
    ];
  }
  return [];
}

function summary(draft: IntakeDraft) {
  const side = TATTOO_SIDES.find((item) => item[0] === draft.side)?.[1] || "";
  const style = TATTOO_STYLE_OPTIONS.find((item) => item[0] === draft.style)?.[1] || "";
  const color = TATTOO_COLORS.find((item) => item[0] === draft.colorMode)?.[1] || "";
  const photo = draft.imageCount ? `${fa(draft.imageCount)} عکس` : "بدون عکس";
  return [
    `نام: ${draft.name}`,
    `شماره: ${draft.phone}`,
    `شماره دوم: ${draft.phone2 || "ندارد"}`,
    `اینستاگرام: ${draft.instagram || "ندارد"}`,
    `نوع: ${TATTOO_REQUEST_LABEL[draft.requestType] || ""}`,
    `محل: ${draft.part} ${side}`,
    `اندازه: ${fa(draft.width)} در ${fa(draft.height)} سانتی‌متر`,
    `سبک: ${style}`,
    `رنگ: ${color}`,
    `شرح: ${draft.idea}`,
    `عکس: ${photo}`,
  ].join("\n");
}

function toPayload(draft: IntakeDraft): IntakePayload {
  const side = TATTOO_SIDES.find((item) => item[0] === draft.side)?.[1] || "";
  const style = TATTOO_STYLE_OPTIONS.find((item) => item[0] === draft.style)?.[1] || draft.style;
  const color = TATTOO_COLORS.find((item) => item[0] === draft.colorMode)?.[1] || "";
  const size = `${draft.width}×${draft.height} سانتی‌متر`;
  return {
    customerName: draft.name,
    customerPhone: draft.phone,
    customerPhone2: draft.phone2 || undefined,
    customerInstagram: draft.instagram || undefined,
    requestType: draft.requestType,
    style,
    styles: [draft.style],
    idea: [
      "خلاصه تأییدشده در میز پذیرش",
      `نوع: ${TATTOO_REQUEST_LABEL[draft.requestType] || draft.requestType}`,
      `محل: ${draft.part}، ${side}`,
      `اندازه: ${size}`,
      `سبک: ${style}`,
      `رنگ: ${color}`,
      `شرح مشتری: ${draft.idea}`,
    ].join("\n"),
    placement: `${draft.part}، ${side}`,
    sizeCm: size,
    sizeMode: "cm",
    colorMode: draft.colorMode,
    bodySide: draft.side,
  };
}

function blank(): IntakeDraft {
  return {
    step: "name",
    fixing: false,
    name: "",
    phone: "",
    phone2: "",
    instagram: "",
    requestType: "",
    part: "",
    side: "",
    width: "",
    height: "",
    style: "",
    colorMode: "",
    idea: "",
    imageCount: 0,
    hasCurrent: false,
  };
}

function stepAfter(step: IntakeStep): IntakeStep {
  const index = ORDER.indexOf(step);
  return ORDER[Math.min(ORDER.length - 1, index + 1)] || "confirm";
}

function mobile(raw: string) {
  const phone = normalizeIranPhone(raw);
  return isIranMobile(phone) ? phone : "";
}

function isSkip(text: string) {
  return text === "pick:skip" || /^(ندارم|نه|خیر|بدون عکس|عکس ندارم)$/.test(text);
}

function parseSize(raw: string) {
  const text = toEnDigits(raw).replace(/سانتی\s*متر|سانت|cm/gi, " ");
  const match = text.match(/(\d{1,2}(?:\.\d+)?)\s*(?:در|x|×|\*|به)\s*(\d{1,2}(?:\.\d+)?)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || width > 60 || height < 1 || height > 60) return null;
  return { width: String(width), height: String(height) };
}

function fa(value: string | number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
}

function fixLabel(step: IntakeStep) {
  const labels: Record<IntakeStep, string> = {
    name: "اصلاح نام",
    phone: "اصلاح شماره",
    phone2: "اصلاح شماره دوم",
    instagram: "اصلاح اینستاگرام",
    type: "اصلاح نوع کار",
    part: "اصلاح محل",
    side: "اصلاح سمت",
    size: "اصلاح اندازه",
    style: "اصلاح سبک",
    color: "اصلاح رنگ",
    idea: "اصلاح شرح",
    image: "اصلاح عکس",
    confirm: "تأیید",
  };
  return labels[step];
}
