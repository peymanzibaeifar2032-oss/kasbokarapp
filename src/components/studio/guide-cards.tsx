import { STUDIO_GUIDE_CARDS, type StudioGuideCard } from "@/lib/studio-guide";
import { cn } from "@/lib/utils";

const faNum = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

const FIELDS: [string, string][] = [
  ["نام و نام خانوادگی", "مثال: سارا محمدی"],
  ["شماره موبایل", "مثال: ۰۹۱۸xxxxxxx"],
  ["شماره دوم (اختیاری)", "اگر دو تا شماره داری"],
  ["نوع درخواست", "تاتوی جدید / کاور / مشاوره"],
  ["سبک", "رئال، بلک‌اندگری، پرتره…"],
  ["محل اجرا", "مثال: ساعد دست راست"],
  ["اندازه به سانتی‌متر", "مثال: ۲۰ × ۱۲"],
  ["روزهای مناسب", "مثال: شنبه و دوشنبه بعدازظهر"],
];

export function StudioGuideCardView({
  card,
  size = "page",
}: {
  card: StudioGuideCard;
  size?: "page" | "share";
}) {
  const share = size === "share";
  return (
    <article
      data-guide-card={card.slug}
      dir="rtl"
      lang="fa"
      className={cn(
        "relative isolate flex flex-col overflow-hidden border border-white/12 bg-[#0b0b0c] text-[#f4f1ea]",
        share
          ? "h-[1350px] w-[1080px] rounded-[48px] px-16 py-16"
          : "aspect-[4/5] w-full rounded-[1.75rem] p-6 sm:p-8",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(183,149,91,.18),transparent_28%),radial-gradient(circle_at_12%_92%,rgba(183,149,91,.08),transparent_26%)]" />
      <div
        className={cn(
          "pointer-events-none absolute border border-[#b7955b]/22",
          share ? "inset-8 rounded-[32px]" : "inset-3 rounded-[1.35rem]",
        )}
      />

      <header className="relative flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "tracking-[.22em] text-[#b7955b]",
              share ? "text-sm" : "text-[10px] sm:text-xs",
            )}
          >
            {card.kicker}
          </p>
          <p className={cn("mt-2 text-white/40", share ? "text-base" : "text-xs")}>
            پیمان زیبائی‌فر
          </p>
        </div>
        {card.visual !== "cover" ? (
          <span
            className={cn(
              "grid place-items-center rounded-full bg-[#b7955b] font-black text-black",
              share ? "size-16 text-2xl" : "size-10 text-sm",
            )}
          >
            {faNum(STUDIO_GUIDE_CARDS.findIndex((c) => c.slug === card.slug))}
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full border border-[#b7955b]/40 px-3 py-1 text-[#dbc08d]",
              share ? "text-sm" : "text-[10px]",
            )}
          >
            ۵ مرحله
          </span>
        )}
      </header>

      <h2
        className={cn(
          "relative mt-6 font-black leading-[1.35]",
          share ? "max-w-[18ch] text-6xl" : "text-[1.7rem] sm:text-3xl",
        )}
      >
        {card.title}
      </h2>
      <p
        className={cn(
          "relative mt-4 max-w-[36ch] leading-8 text-white/62",
          share ? "text-2xl leading-10" : "text-sm",
        )}
      >
        {card.lead}
      </p>

      <div className="relative mt-6 min-h-0 flex-1">
        {card.visual === "form" ? <FormVisual share={share} /> : null}
        {card.visual === "photos" ? (
          <div className={cn("grid", share ? "gap-5" : "gap-3")}>
            <PhotosVisual share={share} />
            <ul className={cn("grid", share ? "gap-2 text-xl leading-9 text-white/70" : "gap-1 text-xs leading-6 text-white/55")}>
              {card.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {card.visual === "login" ? (
          <div className={cn("grid", share ? "gap-5" : "gap-3")}>
            <ol className={cn("grid gap-3", share && "gap-4")}>
              {card.items.map((item, index) => (
                <li
                  key={item}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.04]",
                    share ? "px-5 py-4 text-2xl leading-10" : "px-3 py-2.5 text-sm leading-7",
                  )}
                >
                  <span
                    className={cn(
                      "grid shrink-0 place-items-center rounded-full bg-[#b7955b] font-black text-black",
                      share ? "mt-1 size-9 text-base" : "mt-0.5 size-6 text-[11px]",
                    )}
                  >
                    {faNum(index + 1)}
                  </span>
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ol>
            <LoginVisual share={share} />
          </div>
        ) : null}
        {card.visual === "cover" || card.visual === "review" || card.visual === "pay" ? (
          <ol className={cn("grid gap-3", share && "gap-4 pt-4")}>
            {card.items.map((item, index) => (
              <li
                key={item}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.04]",
                  share ? "px-5 py-4 text-2xl leading-10" : "px-3 py-2.5 text-sm leading-7",
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full bg-[#b7955b] font-black text-black",
                    share ? "mt-1 size-9 text-base" : "mt-0.5 size-6 text-[11px]",
                  )}
                >
                  {faNum(index + 1)}
                </span>
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {card.note ? (
        <p
          className={cn(
            "relative mt-5 rounded-2xl border border-[#b7955b]/30 bg-[#b7955b]/12 leading-7 text-[#e5d2ae]",
            share ? "px-6 py-5 text-xl leading-9" : "px-4 py-3 text-xs",
          )}
        >
          {card.note}
        </p>
      ) : null}

      <footer
        className={cn(
          "relative mt-5 flex items-center justify-between text-white/35",
          share ? "text-base" : "text-[10px]",
        )}
      >
        <span>@peyman_zibaeifar_tattoo</span>
        <span>kasbokarapp.com/studio/guide</span>
      </footer>
    </article>
  );
}

function FakeField({ label, example, share }: { label: string; example: string; share: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[.04]",
        share ? "px-4 py-3.5" : "px-3 py-2",
      )}
    >
      <p className={cn("text-[#b7955b]", share ? "text-sm" : "text-[10px]")}>{label}</p>
      <p className={cn("mt-1 text-white/55", share ? "text-lg" : "text-[11px]")}>{example}</p>
    </div>
  );
}

function FormVisual({ share }: { share: boolean }) {
  return (
    <div className={cn("grid grid-cols-2", share ? "gap-3" : "gap-2")}>
      {FIELDS.map(([label, example]) => (
        <FakeField key={label} label={label} example={example} share={share} />
      ))}
      <div
        className={cn(
          "col-span-2 rounded-xl border border-dashed border-[#b7955b]/35 bg-[#b7955b]/10 text-[#e5d2ae]",
          share ? "px-4 py-4 text-xl" : "px-3 py-2 text-xs",
        )}
      >
        ایده و جزئیات طرح — موضوع، عناصر اصلی و هر نکته مهم
      </div>
    </div>
  );
}

function PhotosVisual({ share }: { share: boolean }) {
  const boxes = [
    { title: "عکس یا رفرنس طرح", hint: "حداکثر ۳ عکس" },
    { title: "عکس واضح محل بدن", hint: "حداکثر ۲ عکس" },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-3", share && "gap-5")}>
      {boxes.map((box) => (
        <div
          key={box.title}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[.03] text-center",
            share ? "min-h-64 px-6" : "min-h-36 px-3 py-6",
          )}
        >
          <span
            className={cn(
              "grid place-items-center rounded-full border border-[#b7955b]/40 text-[#b7955b]",
              share ? "size-16 text-3xl" : "size-10 text-lg",
            )}
          >
            +
          </span>
          <p className={cn("mt-3 font-bold", share ? "text-2xl" : "text-sm")}>{box.title}</p>
          <p className={cn("mt-1 text-white/45", share ? "text-lg" : "text-[11px]")}>{box.hint}</p>
        </div>
      ))}
    </div>
  );
}

function LoginVisual({ share }: { share: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", share && "gap-5")}>
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-[#b7955b] text-center font-black text-black",
          share ? "h-20 text-xl" : "h-12 text-xs",
        )}
      >
        ثبت درخواست
      </div>
      <div
        className={cn(
          "grid place-items-center rounded-2xl border border-white/20 text-center font-bold",
          share ? "h-20 text-xl" : "h-12 text-xs",
        )}
      >
        ورود / ثبت‌نام
      </div>
    </div>
  );
}

export function StudioGuideGrid({ size = "page" }: { size?: "page" | "share" }) {
  return (
    <div
      className={cn(
        size === "share"
          ? "flex flex-col items-start gap-10 bg-black p-10"
          : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {STUDIO_GUIDE_CARDS.map((card) => (
        <StudioGuideCardView key={card.slug} card={card} size={size} />
      ))}
    </div>
  );
}
