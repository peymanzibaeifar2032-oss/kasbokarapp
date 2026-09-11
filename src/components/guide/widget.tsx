import { useRouterState } from "@tanstack/react-router";
import { CircleHelp, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { guideRequest, type GuideChatResponse } from "@/lib/guide/client";
import { suggestionsForPath } from "@/lib/guide/suggestions";
import { safeHttpUrl } from "@/lib/guide/bugs";
import {
  APP_VERSION,
  GUIDE_NAME,
  MAX_BUG_HISTORY,
  MAX_GUIDE_HISTORY,
  MAX_GUIDE_MESSAGE,
} from "@/lib/guide/version";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { cn, newId } from "@/lib/utils";

type Msg = { id: string; role: "user" | "assistant"; text: string };

type Panel = "chat" | "bug";

function deviceInfo() {
  const ua = navigator.userAgent;
  const device = /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : "رایانه";
  const browser = /Edg/i.test(ua)
    ? "Edge"
    : /Chrome/i.test(ua)
      ? "Chrome"
      : /Safari/i.test(ua)
        ? "Safari"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : "نامشخص";
  return { device, browser, ua: ua.slice(0, 280) };
}

function guessRole(signedIn: boolean): "guest" | "user" | "owner" | "admin" {
  return signedIn ? "user" : "guest";
}

function conversationId() {
  try {
    const key = "kasb:guide-cid";
    const cur = sessionStorage.getItem(key);
    if (cur) return cur;
    const id = newId();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return newId();
  }
}

export function GuideWidget() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oosStreak, setOosStreak] = useState(0);
  const [cid, setCid] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "hi",
      role: "assistant",
      text: "سلام، راهنمای سامانه کسب‌وکار هستم. از پیدا کردن روی نقشه تا رزرو و ثبت صفحه می‌توانم مرحله‌به‌مرحله بگویم.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => suggestionsForPath(path), [path]);

  useEffect(() => {
    setCid(conversationId());
  }, []);

  useEffect(() => {
    function sync() {
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, panel]);

  async function send(text: string) {
    const trimmed = text.trim().slice(0, MAX_GUIDE_MESSAGE);
    if (!trimmed || busy) return;
    setInput("");
    setError(null);
    if (offline) {
      setError("آفلاین هستید. اتصال را بررسی کنید؛ فهرست راهنمای ثابت همچنان اینجاست.");
      return;
    }
    const keep = panel === "bug" ? MAX_BUG_HISTORY : MAX_GUIDE_HISTORY;
    const history = messages
      .filter((m) => m.id !== "hi")
      .slice(-keep)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { id: newId(), role: "user", text: trimmed }]);
    setBusy(true);
    try {
      const res = await guideRequest<GuideChatResponse>("chat", {
        message: trimmed,
        history,
        path,
        oosStreak,
        collectingBug: panel === "bug",
        conversationId: cid,
      });
      setOosStreak(res.mode === "out_of_scope" ? res.oosStreak : 0);
      setMessages((m) => [...m, { id: newId(), role: "assistant", text: res.reply }]);
      if (res.mode === "bug_collect") setPanel("bug");
    } catch (err) {
      setError(err instanceof Error ? err.message : "پاسخ نیامد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed z-40 bottom-32 end-3 md:bottom-6 md:end-6">
      <div className="pointer-events-auto flex flex-col items-end">
        {open ? (
          <section
            className="mb-3 flex h-[min(78dvh,36rem)] w-[min(calc(100vw-1.5rem),22.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_rgba(21,42,56,0.22)]"
            role="dialog"
            aria-label={GUIDE_NAME}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold">{GUIDE_NAME}</p>
                <p className="text-[11px] text-muted">{user ? "متناسب با حساب شما" : "بدون ورود هم می‌توانید بپرسید"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "h-9 rounded-full px-3 text-xs",
                    panel === "bug" ? "bg-primary text-primary-fg" : "text-muted hover:bg-bg",
                  )}
                  onClick={() => setPanel(panel === "bug" ? "chat" : "bug")}
                >
                  گزارش مشکل
                </button>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full hover:bg-bg"
                  aria-label="بستن راهنما"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            {panel === "chat" ? (
              <>
                <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[92%] rounded-xl px-3 py-2 text-sm leading-7",
                        m.role === "user" ? "ms-auto bg-primary text-primary-fg" : "bg-bg text-fg",
                      )}
                    >
                      {m.text}
                    </div>
                  ))}
                  {busy ? <p className="text-xs text-muted">در حال نوشتن…</p> : null}
                  {offline ? <p className="text-xs text-danger">اتصال اینترنت قطع است.</p> : null}
                  {error ? <p className="text-xs text-danger">{error}</p> : null}
                  {!busy && messages.length < 4 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                          onClick={() => void send(s.text)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <form
                  className="flex items-end gap-2 border-t border-border p-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <Textarea
                    rows={2}
                    maxLength={MAX_GUIDE_MESSAGE}
                    value={input}
                    placeholder="سؤال درباره همین سامانه…"
                    className="min-h-12 resize-none"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send(input);
                      }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="ارسال">
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            ) : (
              <BugForm
                path={path}
                href={typeof window !== "undefined" ? window.location.href : href}
                signedIn={Boolean(user)}
                conversationId={cid}
                onDone={() => {
                  setPanel("chat");
                  setMessages((m) => [
                    ...m,
                    {
                      id: newId(),
                      role: "assistant",
                      text: "گزارش ثبت شد. مدیریت آن را در پنل می‌بیند.",
                    },
                  ]);
                }}
              />
            )}
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-fg shadow-[0_12px_28px_rgba(28,61,82,0.35)]"
          aria-expanded={open}
          aria-label={open ? "بستن راهنما" : "باز کردن راهنما"}
        >
          {open ? <X className="size-5" /> : <CircleHelp className="size-5" />}
          <span className="pe-1 sm:inline">راهنما</span>
        </button>
      </div>
    </div>
  );
}

function BugForm({
  path,
  href,
  signedIn,
  conversationId,
  onDone,
}: {
  path: string;
  href: string;
  signedIn: boolean;
  conversationId: string;
  onDone: () => void;
}) {
  const info = useMemo(() => (typeof navigator === "undefined" ? { device: "", browser: "", ua: "" } : deviceInfo()), []);
  const [role, setRole] = useState<"guest" | "user" | "owner" | "admin">(guessRole(signedIn));
  const [intent, setIntent] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "critical">("medium");
  const [reproducible, setReproducible] = useState("yes");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const link = attachmentUrl.trim();
    if (link && !safeHttpUrl(link)) {
      setErr("فقط پیوند http یا https قبول است.");
      return;
    }
    setBusy(true);
    try {
      await guideRequest("bug", {
        role,
        pageUrl: href.slice(0, 400),
        routePath: path,
        intent,
        expected,
        actual,
        steps,
        severity,
        reproducible: reproducible === "yes",
        device: info.device,
        browser: info.browser,
        userAgent: info.ua,
        occurredAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        conversationId: conversationId || undefined,
        attachmentUrl: link || undefined,
      });
      onDone();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "ثبت نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" onSubmit={(e) => void submit(e)}>
      <p className="text-xs leading-6 text-muted">
        رمز، کد یک‌بارمصرف، توکن و شماره کارت را ننویسید. صفحه، دستگاه و مرورگر خودکار ثبت می‌شود. آپلود فایل در این نسخه نیست؛ پیوند تصویر را می‌توانید بگذارید.
      </p>
      <label className="block text-xs">
        نقش شما
        <NativeSelect className="mt-1" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="guest">مهمان</option>
          <option value="user">کاربر</option>
          <option value="owner">صاحب کسب‌وکار</option>
          <option value="admin">مدیر</option>
        </NativeSelect>
      </label>
      <label className="block text-xs">
        چه کاری می‌خواستید بکنید
        <Textarea className="mt-1 min-h-16" required minLength={8} value={intent} onChange={(e) => setIntent(e.target.value)} />
      </label>
      <label className="block text-xs">
        انتظار داشتید چه شود
        <Textarea className="mt-1 min-h-16" required minLength={8} value={expected} onChange={(e) => setExpected(e.target.value)} />
      </label>
      <label className="block text-xs">
        در عمل چه شد
        <Textarea className="mt-1 min-h-16" required minLength={8} value={actual} onChange={(e) => setActual(e.target.value)} />
      </label>
      <label className="block text-xs">
        مراحل بازتولید
        <Textarea
          className="mt-1 min-h-16"
          placeholder="۱. … ۲. …"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        پیوند تصویر یا پیوست بعدی (اختیاری)
        <Input
          className="mt-1"
          dir="ltr"
          inputMode="url"
          placeholder="https://"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          شدت
          <NativeSelect className="mt-1" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            <option value="low">کم</option>
            <option value="medium">متوسط</option>
            <option value="critical">بحرانی</option>
          </NativeSelect>
        </label>
        <label className="block text-xs">
          تکرارپذیر
          <NativeSelect className="mt-1" value={reproducible} onChange={(e) => setReproducible(e.target.value)}>
            <option value="yes">بله</option>
            <option value="no">خیر / یک‌بار</option>
          </NativeSelect>
        </label>
      </div>
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      <Button className="w-full" disabled={busy}>
        {busy ? "در حال ثبت…" : "ثبت گزارش"}
      </Button>
    </form>
  );
}
