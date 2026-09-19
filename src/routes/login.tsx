import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authEnabled } from "@/lib/auth/client";
import { getAuthMethods } from "@/lib/auth/status";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { safeNextPath } from "@/lib/format";

export const Route = createFileRoute("/login")({
  loader: async () => getAuthMethods().catch(() => ({ google: false })),
  validateSearch: (s: Record<string, unknown>): { next?: string; error?: string; token?: string } => {
    const next = safeNextPath(s.next);
    const err =
      typeof s.error === "string" ? s.error : typeof s.error_description === "string" ? s.error_description : undefined;
    const token = typeof s.token === "string" && s.token.trim() ? s.token.trim() : undefined;
    return { ...(next ? { next } : {}), ...(err ? { error: err } : {}), ...(token ? { token } : {}) };
  },
  component: Login,
});

function Login() {
  const { next, error, token } = Route.useSearch();
  const dest = next || "/";
  const { user } = useCurrentUserState();
  if (user && !token) return <GoNext dest={dest} />;
  return <LoginForm dest={dest} bounced={Boolean(error)} resetToken={token} />;
}

function GoNext({ dest }: { dest: string }) {
  const router = useRouter();
  useEffect(() => {
    router.history.push(dest);
  }, [dest, router]);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-sm text-muted">
      در حال بازگشت…
    </main>
  );
}

function persistEmailSession(data: unknown) {
  if (typeof window === "undefined") return;
  if (!window.location.hostname.endsWith(".grok-sandbox.com")) return;
  if (!data || typeof data !== "object") return;
  const rec = data as Record<string, unknown>;
  const nested = rec.session && typeof rec.session === "object" ? (rec.session as Record<string, unknown>) : null;
  const token =
    (typeof rec.token === "string" && rec.token) ||
    (nested && typeof nested.token === "string" ? nested.token : null);
  if (!token) return;
  try {
    sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

function LoginForm({ dest, bounced, resetToken }: { dest: string; bounced?: boolean; resetToken?: string }) {
  const authMethods = Route.useLoaderData();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">(resetToken ? "reset" : "up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    if (busy || !authMethods.google) return;
    setBusy(true);
    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: dest,
        errorCallbackURL: `/login?error=google&next=${encodeURIComponent(dest)}`,
      });
      if (res.error) throw new Error(res.error.message || "ورود گوگل انجام نشد.");
    } catch (err) {
      toast.error(err instanceof Error ? persianAuthError(err.message) || err.message : "ورود گوگل انجام نشد.");
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: "/login",
        });
        if (res.error) throw new Error(persianAuthError(res.error.message) || "ارسال پیوند بازیابی انجام نشد.");
        toast.success("اگر این ایمیل ثبت شده باشد، پیوند بازیابی فرستاده شد.");
        setMode("in");
        return;
      }
      if (mode === "reset") {
        if (!resetToken) throw new Error("پیوند بازیابی ناقص است. دوباره درخواست کنید.");
        const res = await authClient.resetPassword({
          newPassword: password,
          token: resetToken,
        });
        if (res.error) throw new Error(persianAuthError(res.error.message) || "تغییر رمز انجام نشد.");
        toast.success("رمز عوض شد. با رمز جدید وارد شوید.");
        setMode("in");
        setPassword("");
        return;
      }
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || "کاربر",
        });
        if (res.error) throw new Error(persianAuthError(res.error.message) || "ثبت‌نام انجام نشد.");
        persistEmailSession(res.data);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(persianAuthError(res.error.message) || "ورود انجام نشد.");
        persistEmailSession(res.data);
      }
      try {
        await authClient.getSession();
      } catch {
        /* session store recovers on next fetch */
      }
      toast.success(mode === "up" ? "حساب ساخته شد." : "وارد شدید.");
      router.history.push(dest);
    } catch (err) {
      toast.error(err instanceof Error ? persianAuthError(err.message) || err.message : "خطا در ورود با ایمیل");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "in"
      ? "ورود با ایمیل و رمز"
      : mode === "up"
        ? "ساخت حساب با ایمیل"
        : mode === "forgot"
          ? "بازیابی رمز عبور"
          : "رمز جدید";

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-fg">
            <Store className="size-5" />
          </span>
          <span>
            <strong className="block">کسب‌وکار</strong>
            <small className="text-muted">ورود سریع با حساب گوگل</small>
          </span>
        </Link>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "forgot"
            ? "ایمیل حساب را بنویسید. پیوند بازیابی به همان ایمیل می‌رود."
            : mode === "reset"
              ? "رمز جدید را حداقل ۸ کاراکتر بنویسید."
              : authMethods.google
                ? "حساب گوگل گوشی را انتخاب کنید؛ نیازی به نوشتن ایمیل و ساخت رمز نیست."
                : "ایمیل و یک رمز حداقل ۸ حرفی بنویسید."}
        </p>

        {bounced ? (
          <div className="mt-4 rounded-xl border border-border bg-bg px-3 py-3 text-sm">
            ورود گوگل روی گوشی قطع می‌شود. از فرم ایمیل همین صفحه استفاده کنید.
          </div>
        ) : mode === "in" || mode === "up" ? (
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-3 py-3 text-sm text-accent">
            اگر صفحهٔ سفید یا خطای سرور دیدید، آن زبانه را ببندید و فقط همین فرم را پر کنید.
          </div>
        ) : null}

        {authEnabled ? (
          <>
            {authMethods.google && (mode === "in" || mode === "up") ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 w-full gap-3"
                  disabled={busy}
                  onClick={() => void signInWithGoogle()}
                >
                  <GoogleMark />
                  ادامه با حساب گوگل
                </Button>
                <div className="my-4 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-border" />
                  <span>یا با ایمیل</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}
            <form onSubmit={(e) => void submit(e)} className={authMethods.google ? "space-y-3" : "mt-5 space-y-3"}>
              {mode === "up" ? (
                <Input
                  id="name"
                  placeholder="نام و نام خانوادگی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              ) : null}
              {mode !== "reset" ? (
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="ایمیل"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  dir="ltr"
                />
              ) : null}
              {mode === "in" || mode === "up" || mode === "reset" ? (
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder={mode === "reset" ? "رمز جدید (حداقل ۸ کاراکتر)" : "رمز عبور (حداقل ۸ کاراکتر)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                />
              ) : null}
              <Button className="w-full" disabled={busy}>
                {busy
                  ? "لطفاً صبر کنید…"
                  : mode === "in"
                    ? "ورود با ایمیل"
                    : mode === "up"
                      ? "ساخت حساب"
                      : mode === "forgot"
                        ? "ارسال پیوند بازیابی"
                        : "ذخیره رمز جدید"}
              </Button>
            </form>
            {mode === "in" ? (
              <button type="button" className="mt-3 block text-sm text-accent" onClick={() => setMode("forgot")}>
                رمز را فراموش کرده‌ام
              </button>
            ) : null}
            <button
              type="button"
              className="mt-3 text-sm text-accent"
              onClick={() => setMode(mode === "in" || mode === "forgot" || mode === "reset" ? "up" : "in")}
            >
              {mode === "in" || mode === "forgot" || mode === "reset" ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">ورود فعلاً غیرفعال است.</p>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.1L6.5 14Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.8 5.5l3.3 2.6A5.8 5.8 0 0 1 12 6Z" />
    </svg>
  );
}

function persianAuthError(message?: string | null) {
  if (!message) return "";
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed") || m.includes("aborted")) {
    return "ارتباط قطع شد. همین صفحه را یک‌بار تازه کنید و دوباره با ایمیل وارد شوید.";
  }
  if (m.includes("invalid origin")) return "این صفحه برای ورود شناخته نشد. از همین برنامه وارد شوید.";
  if (m.includes("بازیابی رمز هنوز")) return message;
  if (m.includes("invalid") || m.includes("credential") || m.includes("password")) return "ایمیل یا رمز درست نیست.";
  if (m.includes("exist")) return "این ایمیل قبلاً ثبت شده. وارد شوید.";
  return message;
}
