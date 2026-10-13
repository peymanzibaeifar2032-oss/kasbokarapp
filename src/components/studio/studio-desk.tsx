import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ConsentSignature } from "@/components/studio/consent-signature";
import type { WizardImage } from "@/components/studio/request-wizard";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/design-images";
import { addBookingToPhoneCalendar, formatFaDateTime, formatToman, isIranMobile, normalizeIranPhone, toEnDigits } from "@/lib/format";
import { JALALI_MONTHS, WEEKDAY_SHORT_FA, gregorianToJalali, jalaliMonthGrid, shiftJalaliMonth, toFaDigits } from "@/lib/calendar/jalali";
import { jalaliDayLabel, tehranClock, tehranDayKey } from "@/lib/hours";
import { answerIntake, startBooking, type IntakeDraft, type IntakePayload } from "@/lib/intake-desk";
import { friendlyError } from "@/lib/save";
import { isTehranThursday } from "@/lib/studio-apprentices";
import { ensureStudioPhoneNotices, scheduleTattooPrepNotices, showStudioOsNotice } from "@/lib/studio-notices";
import { STUDIO_ADDRESS, TATTOO_CUSTOMER_STAGE_LABEL, tattooStage } from "@/lib/tattoo-flow";
import type { GuestStatus } from "@/components/studio/guest-pay-card";

type TextLine = { id: string; from: "desk" | "customer"; text: string; tone?: "sent" };
type CalLine = { id: string; from: "desk"; kind: "calendar" };
type Line = TextLine | CalLine;

const MENU = [
  { id: "ask", label: "سؤال" },
  { id: "status", label: "وضعیت نوبت" },
];

export function StudioDesk({
  busy,
  preferredDay = "",
  sent,
  onSubmit,
}: {
  busy: boolean;
  preferredDay?: string;
  sent: { code: string; phone: string } | null;
  onSubmit: (payload: IntakePayload & { images: WizardImage[] }) => void;
}) {
  const clubCode = useRef("");
  const opened = useRef(false);
  const sentSeen = useRef("");
  const seen = useRef<Record<string, string>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [images, setImages] = useState<WizardImage[]>([]);
  const [chips, setChips] = useState(MENU);
  const [allowImage, setAllowImage] = useState<false | "reference" | "current">(false);
  const [waiting, setWaiting] = useState(false);
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<GuestStatus[]>([]);
  const [receiptFor, setReceiptFor] = useState("");
  const [busyDays, setBusyDays] = useState<string[]>([]);
  const [month, setMonth] = useState(() => {
    const now = tehranClock();
    const today = gregorianToJalali(now.y, now.m, now.day);
    return { jy: today.jy, jm: today.jm };
  });

  function say(from: Line["from"], text: string) {
    setLines((current) => [...current, { id: crypto.randomUUID(), from, text }]);
  }

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    setLines([
      { id: "club", from: "desk", text: "اگر کد عضویت دارید، قبل از هر پیام آن را داخل این چت بفرستید." },
      { id: "hello", from: "desk", text: "اول روز اجرا را بزن. فقط روز سبز کاملاً خالی است و صفحه روی اولین روز خالی باز شده." },
      { id: "cal", from: "desk", kind: "calendar" },
    ]);
    void ensureStudioPhoneNotices();
    try {
      const saved = localStorage.getItem("studio-status-phone") || "";
      if (saved) {
        setPhone(saved);
        void ensureStudioPhoneNotices();
      }
    } catch {
      /* private mode */
    }
    void (async () => {
      try {
        const res = await fetch("/api/tattoo-public?op=open-days");
        const body = (await res.json()) as { ok?: boolean; days?: string[] };
        if (!body?.ok) return;
        const days = body.days || [];
        setBusyDays(days);
        const taken = new Set(days);
        const now = tehranClock();
        const today = gregorianToJalali(now.y, now.m, now.day);
        const todayKey = tehranDayKey();
        let cursor = { jy: today.jy, jm: today.jm };
        for (let i = 0; i < 8; i += 1) {
          const open = jalaliMonthGrid(cursor.jy, cursor.jm).some(
            (cell) => cell.inMonth && cell.dayKey >= todayKey && !isTehranThursday(cell.dayKey) && !taken.has(cell.dayKey),
          );
          if (open) {
            setMonth(cursor);
            return;
          }
          cursor = shiftJalaliMonth(cursor.jy, cursor.jm, 1);
        }
      } catch {
        /* calendar still shows the current month */
      }
    })();
  }, []);

  useEffect(() => {
    if (!phone) return;
    let stop = false;
    async function tick() {
      try {
        const res = await fetch("/api/tattoo-public?op=status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = (await res.json().catch(() => null)) as { items?: GuestStatus[] } | null;
        if (stop || !res.ok) return;
        const found = data?.items ?? [];
        const fresh = found.filter((item) => {
          const prev = seen.current[item.id];
          const next = statusSig(item);
          seen.current[item.id] = next;
          return Boolean(prev) && prev !== next;
        });
        setItems(found);
        const actions = found.flatMap((item) => statusActions(item));
        if (!draftRef.current && actions.length) setChips([...actions, ...MENU]);
        if (!fresh.length) return;
        setLines((current) => [...current, ...fresh.map((item) => ({ id: crypto.randomUUID(), from: "desk" as const, text: statusText(item) }))]);
        setChips(actions.length ? [...actions, ...MENU] : MENU);
        for (const item of fresh) {
          const stage = tattooStage({
            status: item.status,
            paymentStatus: item.paymentStatus || "not_required",
            paymentReviewDeadline: item.paymentReviewDeadline,
          });
          showStudioOsNotice("جواب نوبت تاتو", item.artistMessage || TATTOO_CUSTOMER_STAGE_LABEL[stage] || "وضعیت نوبت عوض شد", item.id);
        }
      } catch {
        /* next tick retries */
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 8000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [phone]);

  useEffect(() => {
    if (!phone) return;
    let stop = false;
    const seenIds = new Set<string>();
    async function tick() {
      try {
        const res = await fetch("/api/tattoo-public?op=chat-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = (await res.json().catch(() => null)) as { lines?: { id: string; from: string; body: string }[]; files?: { id: string; kind: string }[] } | null;
        if (stop || !res.ok) return;
        const rows = data?.lines ?? [];
        for (const line of rows) {
          seenIds.add(line.id);
          const marked = line.body.match(/\[\[(?:consent|signed):([0-9a-f-]{8,})\]\]/i);
          if (marked) seenIds.add(`file:${marked[1]}`);
        }
        const extra = (data?.files ?? []).filter((file) => file.kind === "offer" && !seenIds.has(`file:${file.id}`));
        for (const file of extra) seenIds.add(`file:${file.id}`);
        const fresh = [
          ...rows.filter((line) => line.from === "desk" && !seenIds.has(`shown:${line.id}`)),
          ...extra.map((file) => ({ id: `file:${file.id}`, from: "desk", body: `[[consent:${file.id}]]` })),
        ];
        for (const line of fresh) seenIds.add(`shown:${line.id}`);
        if (!fresh.length) return;
        setLines((current) => [
          ...current,
          ...fresh.flatMap((line) => {
            const rows = [{ id: line.id, from: "desk" as const, text: line.body }];
            if (/شبا|کارت/.test(line.body) && !line.body.includes("عکس رسید را همین‌جا بفرست") && !line.body.startsWith("[[")) {
              rows.push({
                id: `${line.id}-pay`,
                from: "desk",
                text: "قدم بعدی:\n۱. دکمهٔ «تأیید زمان» را بزن.\n۲. بیعانه را به همین کارت واریز کن.\n۳. دکمهٔ «ارسال رسید» را بزن و عکس رسید را همین‌جا بفرست.",
              });
            }
            return rows;
          }),
        ]);
      } catch {
        /* next tick retries */
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [phone]);

  useEffect(() => {
    const box = thread.current;
    const pane = scroller.current;
    if (!box || !pane) return;
    const stick = () => {
      pane.scrollTop = pane.scrollHeight;
    };
    stick();
    const watcher = new ResizeObserver(stick);
    watcher.observe(box);
    return () => watcher.disconnect();
  }, [lines, chips, waiting]);

  useEffect(() => {
    if (!sent || sentSeen.current === sent.code) return;
    sentSeen.current = sent.code;
    setDraft(null);
    setChips(MENU);
    setAllowImage(false);
    const normalized = normalizeIranPhone(sent.phone);
    if (isIranMobile(normalized)) {
      setPhone(normalized);
      void postCustomerLine(normalized, `درخواست ثبت شد. کد ${sent.code}`);
    }
    void ensureStudioPhoneNotices();
    say("desk", `درخواستت ثبت شد و به صندوق ورودی آمد. کد پیگیری ${sent.code} است. جواب پیمان همین‌جا می‌آید، بدون تازه‌کردن صفحه.`);
  }, [sent]);

  async function ask(question: string) {
    setWaiting(true);
    say("customer", question);
    if (phone) void postCustomerLine(phone, question);
    say("desk", "دارم جواب می‌دهم…");
    const history = lines.slice(-8).flatMap((line) => ("text" in line ? [{ role: line.from === "customer" ? "user" as const : "assistant" as const, content: line.text }] : []));
    const answer = await askStudio(question, history);
    setWaiting(false);
    setLines((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last && "text" in last && last.text === "دارم جواب می‌دهم…") next.pop();
      if (answer === "handoff") {
        return [...next, { id: crypto.randomUUID(), from: "desk" as const, tone: "sent" as const, text: "پیام برای پیمان زیبائی‌فر ارسال شد. در اولین فرصت جواب می‌دهد." }];
      }
      return [...next, { id: crypto.randomUUID(), from: "desk" as const, text: answer }];
    });
    setChips(MENU);
  }

  function beginRequest(day = preferredDay, dayKey = "") {
    if (!day) {
      say("desk", "اول یک روز سبز را از تقویم بزن.");
      return;
    }
    const first = startBooking(day, dayKey);
    setDraft(first.draft);
    setLines((current) => [...current, ...first.say.map((text) => ({ id: crypto.randomUUID(), from: "desk" as const, text }))]);
    setChips(first.chips);
    setAllowImage(first.image);
  }

  async function applyIntake(raw: string, nextImages = images, shown?: string) {
    if (!draft || busy || waiting) return;
    const turn = answerIntake(draft, raw, {
      design: nextImages.some((image) => image.kind === "reference" || image.kind === "sketch"),
      current: nextImages.some((image) => image.kind === "current"),
    });
    setDraft(turn.draft);
    if (isIranMobile(normalizeIranPhone(turn.draft.phone))) setPhone(normalizeIranPhone(turn.draft.phone));
    setAllowImage(turn.image);
    setText("");
    const customer = shown || customerText(raw);
    if (turn.needsModel && turn.modelQuestion) {
      await ask(turn.modelQuestion);
      if (turn.after) say("desk", turn.after);
      setChips(turn.chips.length ? turn.chips : MENU);
      return;
    }
    setLines((current) => [
      ...current,
      { id: crypto.randomUUID(), from: "customer", text: customer },
      ...turn.say.map((text) => ({ id: crypto.randomUUID(), from: "desk" as const, text })),
    ]);
    setChips(turn.payload ? MENU : turn.chips);
    if (turn.payload) onSubmit({ ...turn.payload, images: nextImages, referralCode: clubCode.current || undefined });
  }

  async function lookup(raw: string) {
    setWaiting(true);
    try {
      const res = await fetch("/api/tattoo-public?op=status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw, code: raw }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; items?: GuestStatus[] } | null;
      if (!res.ok) throw new Error(data?.error || "وضعیت پیدا نشد.");
      const found = data?.items ?? [];
      setItems(found);
      for (const item of found) seen.current[item.id] = statusSig(item);
      const normalized = normalizeIranPhone(raw);
      if (isIranMobile(normalized)) {
        setPhone(normalized);
        try {
          localStorage.setItem("studio-status-phone", normalized);
        } catch {
          /* private mode */
        }
      }
      if (!found.length) {
        say("desk", "با این شماره هنوز درخواستی نیست. اگر وقت می‌خواهی، درخواست وقت را بزن.");
      } else {
        for (const item of found) say("desk", statusText(item));
        const actions = found.flatMap((item) => statusActions(item));
        setChips(actions.length ? [...actions, ...MENU] : MENU);
        return;
      }
    } catch (err) {
      say("desk", friendlyError(err));
    } finally {
      setWaiting(false);
    }
    setChips(MENU);
  }

  async function post(op: "accept" | "receipt", item: GuestStatus, receiptImage?: string) {
    if (!phone) {
      say("desk", "اول شماره همان درخواست را بنویس.");
      return;
    }
    setWaiting(true);
    try {
      const res = await fetch(`/api/tattoo-public?op=${op}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, phone, ...(receiptImage ? { receiptImage } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "انجام نشد.");
      say("desk", op === "accept" ? "زمان تأیید شد. حالا بیعانه را به همان کارت واریز کن و دکمهٔ ارسال رسید را بزن. عکس رسید را همین‌جا بفرست." : "رسید رسید. بررسی می‌شود.");
      await lookup(phone);
    } catch (err) {
      say("desk", friendlyError(err));
      setWaiting(false);
    }
  }

  async function onChip(id: string, label: string) {
    if (id === "ask") {
      setDraft(null);
      setChips([]);
      say("desk", "سؤالت را بنویس.");
      return;
    }
    if (id === "status") {
      setDraft(null);
      if (phone) {
        say("customer", "وضعیت نوبت");
        await lookup(phone);
        return;
      }
      say("desk", "شماره موبایل یا کد پیگیری را بنویس.");
      setChips([]);
      setReceiptFor("await-phone");
      return;
    }
    if (id === "days" || id === "request") {
      setDraft(null);
      setChips(MENU);
      say("desk", "روز سبز را از تقویم بالا بزن.");
      return;
    }
    if (id.startsWith("status:")) {
      const [, action, requestId] = id.split(":");
      const item = items.find((row) => row.id === requestId);
      if (!item) return;
      if (action === "accept") {
        say("customer", "این زمان را تأیید می‌کنم");
        await post("accept", item);
      }
      if (action === "receipt") {
        setReceiptFor(item.id);
        say("desk", "بیعانه را اگر واریز کردی، عکس رسید را از دکمهٔ عکس بفرست.");
      }
      if (action === "cal" && item.proposedSlotStart) {
        const end = item.proposedSlotEnd ? new Date(item.proposedSlotEnd).getTime() : NaN;
        const start = new Date(item.proposedSlotStart).getTime();
        const minutes = Number.isFinite(end) && end > start ? Math.max(10, Math.round((end - start) / 60000)) : item.sessionMinutes || 120;
        scheduleTattooPrepNotices(item.proposedSlotStart, item.customerName || "مشتری");
        addBookingToPhoneCalendar({
          title: "نوبت تاتو · پیمان زیبائی‌فر",
          startIso: item.proposedSlotStart,
          minutes,
          location: STUDIO_ADDRESS,
          description: [item.style, item.artistMessage].filter(Boolean).join(" — "),
          fileName: `tattoo-${item.id}.ics`,
        });
        say("desk", "زمان به تقویم گوشی اضافه شد.");
      }
      return;
    }
    if (draft) void applyIntake(`pick:${id}`, images, label);
  }

  async function claimClub(raw: string) {
    const code = toEnDigits(raw).replace(/\s/g, "").toUpperCase();
    setWaiting(true);
    try {
      const res = await fetch("/api/tattoo-public?op=club-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; name?: string; attached?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok || !data.name) {
        say("desk", data?.error || "این کد عضویت پیدا نشد.");
        return;
      }
      clubCode.current = code;
      say("desk", data.attached
        ? `کد عضویت برای ${data.name} ثبت شد. این درخواست زیرمجموعهٔ او حساب می‌شود.`
        : `کد عضویت برای ${data.name} است. با ثبت درخواست، زیرمجموعهٔ او حساب می‌شوی.`);
    } catch {
      say("desk", "کد عضویت ثبت نشد. یک بار دیگر بفرست.");
    } finally {
      setWaiting(false);
    }
  }

  async function onSend() {
    const raw = text.trim();
    if (!raw || waiting || busy) return;
    if (looksLikeClubCode(raw)) {
      setText("");
      say("customer", raw);
      await claimClub(raw);
      return;
    }
    setText("");
    if (draft) {
      void applyIntake(raw);
      return;
    }
    if (receiptFor === "await-phone" || looksLikeIdentity(raw)) {
      say("customer", raw);
      setReceiptFor("");
      await lookup(raw);
      return;
    }
    await ask(raw);
  }

  async function onPhoto(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (receiptFor && receiptFor !== "await-phone") {
      const item = items.find((row) => row.id === receiptFor);
      if (!item) return;
      try {
        const image = await compressImage(file);
        say("customer", "رسید را فرستادم");
        setReceiptFor("");
        await post("receipt", item, image);
      } catch (err) {
        toast.error(friendlyError(err));
      }
      return;
    }
    if (!draft) return;
    const kind = allowImage === "current" ? "current" : "reference";
    try {
      const packed = await Promise.all(Array.from(list).slice(0, 3).map(compressImage));
      const nextImages = [...images, ...packed.map((data) => ({ kind, data }) as WizardImage)].slice(0, 3);
      setImages(nextImages);
      void applyIntake("فرستادم", nextImages, "عکس را فرستادم");
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-3 pb-3">
      <div ref={scroller} className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pb-2">
        <div ref={thread} className="grid content-start gap-2">
        {lines.map((line) =>
          "kind" in line ? (
            <MonthBubble key={line.id} month={month} busy={busyDays} onMonth={setMonth} onPick={(label, key) => beginRequest(label, key)} />
          ) : (
            (() => {
              const mark = line.text.trim().match(/\[\[consent:([0-9a-f-]{8,})\]\]/i);
              if (mark && line.from === "desk") {
                return <GuestConsent key={line.id} phone={phone} fileId={mark[1]} />;
              }
              return (
            <p
              key={line.id}
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-7 ${line.tone === "sent" ? "justify-self-start bg-[#1f8a4c] font-bold text-white" : line.from === "desk" ? "justify-self-start bg-white" : "justify-self-end bg-[#2f80ed] text-white"}`}
            >
              {line.text.startsWith("[[signed:") ? "فرم امضاشده را فرستادم." : line.text}
            </p>
              );
            })()
          ),
        )}
        {waiting ? <p className="justify-self-start rounded-2xl bg-white px-3 py-2 text-sm text-slate-400">…</p> : null}
        </div>
      </div>
      {chips.length ? (
        <div className="flex gap-2 overflow-x-auto py-2">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="h-10 shrink-0 rounded-full bg-white px-3 text-sm font-bold" onClick={() => void onChip(chip.id, chip.label)}>
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="pt-1 text-center text-[11px] leading-5 text-slate-500">اگر کد عضویت دارید، قبل از پیام آن را همین‌جا بفرستید.</p>
      <div className="flex shrink-0 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void onSend();
          }}
          placeholder="بنویس"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
          onFocus={() => {
            window.setTimeout(() => {
              if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
            }, 80);
          }}
        />
        <label className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl bg-white">
          <ImagePlus className="size-5" />
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onPhoto(event.target.files)} />
        </label>
        <Button className="h-12 bg-[#2f80ed] text-white" disabled={busy || waiting || !text.trim()} onClick={() => void onSend()}>
          بفرست
        </Button>
      </div>
    </div>
  );
}

function GuestConsent({ phone, fileId }: { phone: string; fileId: string }) {
  const [image, setImage] = useState("");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!phone) return;
    let stop = false;
    void fetch("/api/tattoo-public?op=chat-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, id: fileId }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { image?: string } | null;
        if (stop) return;
        if (!res.ok || !body?.image) setFailed(true);
        else setImage(body.image);
      })
      .catch(() => {
        if (!stop) setFailed(true);
      });
    return () => {
      stop = true;
    };
  }, [phone, fileId]);
  async function send(stamped: string) {
    const res = await fetch("/api/tattoo-public?op=chat-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, image: stamped }),
    });
    if (!res.ok) {
      toast.error("ارسال امضا انجام نشد. یک بار دیگر تأیید امضا را بزن.");
      return;
    }
    setSent(true);
    setOpen(false);
  }
  return (
    <div className="justify-self-start max-w-[92%] rounded-2xl bg-white p-2">
      <p className="px-1 text-sm leading-7">امضای این فرم الزامی است. دکمه را بزن، با انگشت داخل کادر سفید امضا کن و تأیید امضا را بزن.</p>
      {image ? <img src={image} alt="فرم رضایت‌نامه" className="mt-2 max-h-80 w-full rounded-xl border border-slate-200 object-contain" /> : <p className="mt-2 text-sm text-slate-400">{failed ? "تصویر فرم باز نشد. صفحه را یک بار تازه کن." : "فرم رضایت‌نامه در حال باز شدن است…"}</p>}
      {sent ? <p className="mt-2 text-sm font-bold text-[#1f8a4c]">امضا ثبت شد و برای پیمان فرستاده شد.</p> : null}
      {!sent && image && !open ? (
        <Button className="mt-2 h-11 w-full bg-[#2f80ed] text-white" onClick={() => setOpen(true)}>امضای فرم رضایت‌نامه</Button>
      ) : null}
      {open && image ? (
        <ConsentSignature
          sheet={image}
          startOpen
          hideSheet
          saveLabel="تأیید امضا"
          hint="امضای این فرم الزامی است. با انگشت داخل کادر سفید امضا کن. امضا روی جای امضای پایین فرم می‌نشیند."
          onPick={(stamped) => void send(stamped)}
        />
      ) : null}
    </div>
  );
}

function MonthBubble({
  month,
  busy,
  onMonth,
  onPick,
}: {
  month: { jy: number; jm: number };
  busy: string[];
  onMonth: (next: { jy: number; jm: number }) => void;
  onPick: (label: string, dayKey: string) => void;
}) {
  const todayKey = tehranDayKey();
  const taken = useMemo(() => new Set(busy), [busy]);
  const cells = jalaliMonthGrid(month.jy, month.jm);
  return (
    <div className="justify-self-start rounded-2xl bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold">
        <button type="button" onClick={() => onMonth(shiftJalaliMonth(month.jy, month.jm, -1))}>قبل</button>
        <span>{JALALI_MONTHS[month.jm - 1]} {toFaDigits(month.jy)}</span>
        <button type="button" onClick={() => onMonth(shiftJalaliMonth(month.jy, month.jm, 1))}>بعد</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {WEEKDAY_SHORT_FA.map((name) => <span key={name}>{name}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const open = cell.inMonth && cell.dayKey >= todayKey && !isTehranThursday(cell.dayKey) && !taken.has(cell.dayKey);
          const closed = cell.inMonth && !open;
          return (
            <button
              key={cell.dayKey + (cell.inMonth ? "" : "-pad")}
              type="button"
              disabled={!open}
              onClick={() => onPick(jalaliDayLabel(cell.gy, cell.gm, cell.gd), cell.dayKey)}
              className={`h-8 rounded-lg text-xs ${!cell.inMonth ? "invisible" : open ? "bg-[#1f8a4c] font-bold text-white" : closed && cell.dayKey >= todayKey ? "bg-slate-100 text-slate-400" : "text-slate-300"}`}
            >
              {cell.inMonth ? toFaDigits(cell.jd) : ""}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">سبز یعنی خالی. زدنش درخواست است، نه نوبت قطعی.</p>
    </div>
  );
}

function statusSig(item: GuestStatus) {
  return [item.status, item.paymentStatus, item.artistMessage, item.proposedSlotStart, item.priceMinToman, item.depositToman].join("|");
}

function statusText(item: GuestStatus) {
  const stage = tattooStage({
    status: item.status,
    paymentStatus: item.paymentStatus || "not_required",
    paymentReviewDeadline: item.paymentReviewDeadline,
  });
  return [
    item.customerName,
    TATTOO_CUSTOMER_STAGE_LABEL[stage] || stage,
    [item.style, item.placement].filter(Boolean).join(" · "),
    item.artistMessage || "",
    item.priceMinToman ? `قیمت ${formatToman(item.priceMinToman)}` : "",
    item.depositToman ? `بیعانه ${formatToman(item.depositToman)}` : "",
    item.proposedSlotStart ? formatFaDateTime(item.proposedSlotStart) : "",
    item.paymentCardNumber ? `کارت ${item.paymentCardNumber}` : "",
    item.trackingCode ? `کد ${item.trackingCode}` : "",
  ].filter(Boolean).join("\n");
}

function statusActions(item: GuestStatus) {
  const stage = tattooStage({
    status: item.status,
    paymentStatus: item.paymentStatus || "not_required",
    paymentReviewDeadline: item.paymentReviewDeadline,
  });
  const actions: { id: string; label: string }[] = [];
  if (item.paymentStatus === "proposal_pending") actions.push({ id: `status:accept:${item.id}`, label: "تأیید زمان" });
  if (item.paymentStatus === "awaiting_payment" || item.paymentStatus === "rejected") actions.push({ id: `status:receipt:${item.id}`, label: "ارسال رسید" });
  if (stage === "booked" && item.proposedSlotStart) actions.push({ id: `status:cal:${item.id}`, label: "افزودن به تقویم گوشی" });
  return actions;
}

function looksLikeClubCode(raw: string) {
  const code = toEnDigits(raw).replace(/\s/g, "").toUpperCase();
  return /^[A-Z0-9]{2,12}-\d{3,6}$/.test(code);
}

function looksLikeIdentity(raw: string) {
  const code = raw.replace(/\s/g, "");
  if (/^\d{6}$/.test(code)) return true;
  return isIranMobile(normalizeIranPhone(raw));
}

function customerText(raw: string) {
  if (raw.startsWith("pick:")) return raw.slice(5);
  return raw;
}

async function postCustomerLine(phone: string, text: string) {
  try {
    await fetch("/api/tattoo-public?op=chat-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });
  } catch {
    /* the line stays on screen; the next question can retry */
  }
}

async function askStudio(question: string, history: { role: "user" | "assistant"; content: string }[]) {
  try {
    const res = await fetch("/api/tattoo-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });
    const data = (await res.json().catch(() => null)) as { answer?: string; error?: string; handoff?: boolean } | null;
    if (data?.handoff || /جواب این سؤال را ندارم/.test(data?.answer || "")) return "handoff";
    return data?.answer || data?.error || "handoff";
  } catch {
    return "handoff";
  }
}
