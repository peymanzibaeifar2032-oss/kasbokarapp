import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { formatFaDate, toSmsLink, toTelLink } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";

type Desk = {
  summary: { members: number; active: number; pending: number; successful: number; prizesActive: number; prizesUsed: number };
  settings: {
    prize5: string;
    prize10: string;
    smsSubmitted: string;
    smsPriced: string;
    smsBooked: string;
    smsPrize5: string;
    smsPrize10: string;
  };
  outbox: { id: string; phone: string; body: string }[];
  referrers: {
    id: string;
    name: string;
    phone: string;
    code: string;
    active: boolean;
    tier: string;
    total: number;
    successful: number;
    pending: number;
    reward: string;
  }[];
};

type FileView = {
  referrer: { id: string; name: string; phone: string; code: string; active: boolean; tier: string; created_at: string };
  rewards: { milestone: number; title: string; status: string }[];
  referrals: {
    id: string;
    phone: string;
    successful: boolean;
    closed?: boolean;
    steps: { key: string; label: string; done: boolean }[];
  }[];
};

const TIERS = [
  ["active", "فعال"],
  ["vip", "VIP"],
  ["limited", "محدود"],
  ["inactive", "غیرفعال"],
] as const;

export function ReferralAdmin() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [file, setFile] = useState<FileView | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number][0]>("active");
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function load() {
    const next = await saveAction<Desk>("referralDesk");
    setDesk(next);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(friendlyError(err)));
  }, []);

  async function saveMember(active: boolean) {
    try {
      const saved = await saveAction<{ code: string }>("setReferralMember", { name, phone, code, tier, active });
      toast.success(active ? `باشگاه فعال شد. کد ${saved.code}` : "عضویت غیرفعال شد.");
      setCode(saved.code);
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function openFile(id: string) {
    try {
      const next = await saveAction<FileView>("referralFile", { id });
      setFile(next);
      setName(next.referrer.name);
      setPhone(next.referrer.phone);
      setCode(next.referrer.code);
      const known = TIERS.some((item) => item[0] === next.referrer.tier);
      setTier(known ? (next.referrer.tier as (typeof TIERS)[number][0]) : "active");
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  if (file) {
    const person = file.referrer;
    const success = file.referrals.filter((row) => row.successful).length;
    const pending = file.referrals.filter((row) => !row.successful && !row.closed).length;
    const tel = toTelLink(person.phone);
    return (
      <section className="mt-5 grid gap-4">
        <Button variant="outline" className="w-fit" onClick={() => setFile(null)}>بازگشت به لیست</Button>
        <article className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-lg font-bold">{person.name}</h2>
          <p className="mt-2 text-sm" dir="ltr">{person.phone}</p>
          <p className="mt-1 text-sm">کد معرف: <span dir="ltr">{person.code}</span></p>
          <p className="mt-1 text-sm">عضویت: {formatFaDate(person.created_at)}</p>
          <p className="mt-1 text-sm">وضعیت داخلی: {TIERS.find((item) => item[0] === person.tier)?.[1]} · {person.active ? "عضو فعال" : "غیرفعال"}</p>
          <p className="mt-1 text-sm">
            {success} قطعی از {file.referrals.length} معرفی
            {" · "}
            {pending} در حال بررسی
            {" · "}
            جایزه فعال {file.rewards.filter((item) => item.status === "active").length}
            {" · "}
            استفاده‌شده {file.rewards.filter((item) => item.status === "used").length}
          </p>
          <div className="mt-3 flex gap-2">
            {tel ? <a className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-fg" href={tel}>تماس</a> : null}
          </div>
          <MemberSms person={person} success={success} rewards={file.rewards} settings={desk?.settings} />
          <div className="mt-4 grid gap-2">
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} dir="ltr" placeholder="کد معرف" />
            <NativeSelect value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
              {TIERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </NativeSelect>
            <div className="flex gap-2">
              <Button onClick={() => void saveMember(true).then(() => openFile(person.id))}>ذخیره کد و وضعیت</Button>
              <Button variant="outline" onClick={() => void saveMember(false).then(() => openFile(person.id))}>غیرفعال کردن کد</Button>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-bold">جایزه‌ها</h3>
          {[5, 10].map((milestone) => {
            const reward = file.rewards.find((item) => item.milestone === milestone);
            return (
              <div key={milestone} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{milestone === 5 ? "۵ معرفی" : "۱۰ معرفی"} · {reward?.title || "هنوز فعال نشده"} · {reward?.status === "used" ? "استفاده شد" : reward ? "فعال" : "در انتظار"}</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void saveAction("setReferralReward", { referrerId: person.id, milestone, status: "active" }).then(() => openFile(person.id))}>فعال</Button>
                  <Button size="sm" variant="outline" onClick={() => void saveAction("setReferralReward", { referrerId: person.id, milestone, status: "used" }).then(() => openFile(person.id))}>استفاده شد</Button>
                </span>
              </div>
            );
          })}
        </article>
        {file.referrals.map((row, index) => (
          <article key={row.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">معرفی {index + 1}</h3>
              <span className="text-sm">{row.successful ? "موفق" : "هنوز قطعی نیست"}</span>
            </div>
            <p className="mt-1 text-sm text-muted" dir="ltr">{row.phone}</p>
            <ol className="mt-3 grid gap-1 text-sm leading-7">
              {row.steps.map((step) => (
                <li key={step.key} className={step.done ? "text-foreground" : "text-muted"}>{step.done ? "✓" : "○"} {step.label}</li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void saveAction("setReferralOverride", { id: row.id, success: true }).then(() => openFile(person.id))}>تأیید دستی</Button>
              <Button size="sm" variant="outline" onClick={() => void saveAction("setReferralOverride", { id: row.id, success: false }).then(() => openFile(person.id))}>رد</Button>
              <Button size="sm" variant="outline" onClick={() => void saveAction("setReferralOverride", { id: row.id, success: null }).then(() => openFile(person.id))}>برگشت به وضعیت واقعی</Button>
            </div>
          </article>
        ))}
      </section>
    );
  }

  const summary = desk?.summary;
  return (
    <section className="mt-5 grid gap-4">
      <article className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-bold">باشگاه مشتریان</h2>
        <p className="mt-1 text-sm leading-7 text-muted">امتیاز فقط بعد از نوبت قطعی ثبت می‌شود. عضویت خودکار نیست.</p>
        {summary ? (
          <p className="mt-3 text-sm leading-7">
            {summary.members} عضو · {summary.active} فعال · {summary.pending} در بررسی · {summary.successful} موفق · {summary.prizesActive} جایزه فعال · {summary.prizesUsed} استفاده‌شده
          </p>
        ) : null}
      </article>
      <article className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-bold">عضو باشگاه معرفین</h3>
        <div className="mt-3 grid gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="نام" />
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" placeholder="شماره موبایل" />
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} dir="ltr" placeholder="کد، مثلاً PEYMAN-2847؛ خالی بماند خودش ساخته می‌شود" />
          <NativeSelect value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
            {TIERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </NativeSelect>
          <div className="flex gap-2">
            <Button onClick={() => void saveMember(true)}>فعال</Button>
            <Button variant="outline" onClick={() => void saveMember(false)}>غیرفعال</Button>
          </div>
        </div>
      </article>
      {(desk?.outbox || []).length ? (
        <article className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-bold">پیامک‌های آماده</h3>
          <p className="mt-1 text-xs leading-6 text-muted">این‌ها همان پیام‌های مرحله‌ای هستند. با زدن ارسال، شماره و متن در پیامک گوشی باز می‌شود.</p>
          {desk?.outbox.map((item) => (
            <div key={item.id} className="mt-3 border-t border-border pt-3 text-sm">
              <p dir="ltr">{item.phone}</p>
              <p className="mt-1 leading-7">{item.body}</p>
              <a
                className="mt-2 inline-flex h-10 items-center rounded-xl bg-primary px-3 font-bold text-primary-fg"
                href={toSmsLink(item.phone, item.body) || "#"}
                onClick={(event) => {
                  const href = toSmsLink(item.phone, item.body);
                  if (!href) {
                    event.preventDefault();
                    toast.error("شماره برای پیامک معتبر نیست.");
                    return;
                  }
                  void saveAction("markReferralSms", { id: item.id }).then(load);
                }}
              >
                ارسال پیامک
              </a>
            </div>
          ))}
        </article>
      ) : null}
      <div className="grid gap-2">
        {(desk?.referrers || []).map((row) => (
          <button key={row.id} type="button" className="rounded-2xl border border-border bg-surface p-4 text-right" onClick={() => void openFile(row.id)}>
            <span className="flex items-center justify-between gap-2">
              <strong>{row.name}</strong>
              <span className="text-sm text-muted">{row.successful} از {row.total}</span>
            </span>
            <span className="mt-1 block text-sm text-muted" dir="ltr">{row.phone} · {row.code}</span>
            <span className="mt-1 block text-sm">
              {row.reward} · {TIERS.find((item) => item[0] === row.tier)?.[1]} · {row.active ? "فعال" : "غیرفعال"}
              {row.pending > 0 ? ` · ${row.pending} نیاز به پیگیری` : ""}
            </span>
          </button>
        ))}
      </div>
      <Button variant="outline" onClick={() => setSettingsOpen((value) => !value)}>{settingsOpen ? "بستن تنظیمات" : "متن جایزه و پیامک"}</Button>
      {settingsOpen && desk ? <SettingsForm settings={desk.settings} onSaved={() => void load()} /> : null}
    </section>
  );
}

function SettingsForm({ settings, onSaved }: { settings: Desk["settings"]; onSaved: () => void }) {
  const [draft, setDraft] = useState(settings);
  function set(key: keyof Desk["settings"], value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <article className="grid gap-2 rounded-2xl border border-border bg-surface p-4">
      <Input value={draft.prize5} onChange={(event) => set("prize5", event.target.value)} placeholder="جایزه ۵ معرفی" />
      <Input value={draft.prize10} onChange={(event) => set("prize10", event.target.value)} placeholder="جایزه ۱۰ معرفی" />
      {([
        ["smsSubmitted", "پیام بررسی"],
        ["smsPriced", "پیام قیمت"],
        ["smsBooked", "پیام معرفی موفق"],
        ["smsPrize5", "پیام جایزه ۵"],
        ["smsPrize10", "پیام جایزه ۱۰"],
      ] as const).map(([key, label]) => (
        <label key={key} className="text-sm">
          {label}
          <Textarea className="mt-1" rows={2} value={draft[key]} onChange={(event) => set(key, event.target.value)} />
        </label>
      ))}
      <p className="text-xs leading-6 text-muted">در متن می‌توانی {"{code}"} برای کد عضویت، {"{count}"} برای تعداد و {"{prize}"} برای جایزه بگذاری.</p>
      <Button onClick={() => void saveAction("saveReferralSettings", draft).then(() => { toast.success("متن‌ها ذخیره شد."); onSaved(); }).catch((err) => toast.error(friendlyError(err)))}>ذخیره متن‌ها</Button>
    </article>
  );
}

const FALLBACK_SMS = {
  smsSubmitted: "یکی از دوستانی که با کد معرف شما درخواست داده، وارد مرحله بررسی شد.\nکد عضویت شما: {code}",
  smsPriced: "برای یکی از معرفی‌های شما قیمت و شرایط مشخص شد.\nکد عضویت شما: {code}",
  smsBooked: "یک معرفی موفق برای شما ثبت شد. اکنون {count} معرفی موفق از ۱۰ معرفی دارید.\nکد عضویت شما: {code}",
  smsPrize5: "تبریک! شما ۵ معرفی موفق دارید. جایزه شما فعال شد: {prize}. برای هماهنگی ثبت نوبت از پنل خود اقدام کنید.\nکد عضویت شما: {code}",
  smsPrize10: "تبریک! شما ۱۰ معرفی موفق دارید. جایزه دوم شما فعال شد: {prize}.\nکد عضویت شما: {code}",
  prize5: "یک طرح مینیمال تا ۱۲ سانتی‌متر",
  prize10: "یک طرح تا ۲۶ سانتی‌متر",
};

function fillClubSms(text: string, count: number, prize: string, code: string) {
  const body = text
    .replaceAll("{count}", new Intl.NumberFormat("fa-IR").format(count))
    .replaceAll("{prize}", prize)
    .replaceAll("{code}", code);
  if (!code || body.includes(code)) return body;
  return `${body}\nکد عضویت شما: ${code}`;
}

function openClubSms(phone: string, text: string) {
  const href = toSmsLink(phone, text);
  if (!href) {
    toast.error("شماره برای پیامک معتبر نیست.");
    return;
  }
  window.location.assign(href);
}

function MemberSms({
  person,
  success,
  rewards,
  settings,
}: {
  person: { name: string; phone: string; code: string };
  success: number;
  rewards: { milestone: number; title: string; status: string }[];
  settings?: Desk["settings"];
}) {
  const prize5 = rewards.find((item) => item.milestone === 5)?.title || settings?.prize5 || FALLBACK_SMS.prize5;
  const prize10 = rewards.find((item) => item.milestone === 10)?.title || settings?.prize10 || FALLBACK_SMS.prize10;
  const texts = settings || FALLBACK_SMS;
  const ready = [
    {
      label: "کد عضویت",
      body: `سلام ${person.name}\nکد عضویت باشگاه مشتریان تو: ${person.code}\nاین کد را به دوستت بده. وقتی نوبت او قطعی شد، یک معرفی موفق برای تو ثبت می‌شود.\n۵ معرفی موفق: ${prize5}\n۱۰ معرفی موفق: ${prize10}`,
    },
    { label: "وارد بررسی شد", body: fillClubSms(texts.smsSubmitted, success, "", person.code) },
    { label: "قیمت اعلام شد", body: fillClubSms(texts.smsPriced, success, "", person.code) },
    { label: "معرفی موفق", body: fillClubSms(texts.smsBooked, success, "", person.code) },
    { label: "جایزه ۵", body: fillClubSms(texts.smsPrize5, success, prize5, person.code) },
    { label: "جایزه ۱۰", body: fillClubSms(texts.smsPrize10, success, prize10, person.code) },
  ];
  return (
    <div className="mt-4 rounded-2xl border border-border bg-bg p-3">
      <p className="text-sm font-semibold">پیامک از گوشی خودت</p>
      <p className="mt-1 text-xs leading-6 text-muted">با زدن هر دکمه، شماره همین عضو در پیامک باز می‌شود و متن، همراه کد عضویت، آماده ارسال است.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ready.map((item) => (
          <Button key={item.label} type="button" size="sm" variant={item.label === "کد عضویت" ? "default" : "outline"} onClick={() => openClubSms(person.phone, item.body)}>
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
