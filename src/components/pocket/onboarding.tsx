import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Languages, BriefcaseBusiness } from "lucide-react";
import {
  PROFESSION_CATEGORIES,
  PROFESSION_PACKS,
  professionSearchText,
  normalizeProfessionSearch,
  type PocketLocale,
  type ProfessionCategoryId,
  type ProfessionId,
} from "@/lib/pocket/professions";
import "./pocket.css";

type Props = {
  onDone: (locale: PocketLocale, professionId: ProfessionId) => void;
};

export function PocketOnboarding({ onDone }: Props) {
  const [step, setStep] = useState<"language" | "profession">("language");
  const [locale, setLocale] = useState<PocketLocale>("fa");
  const [categoryId, setCategoryId] = useState<ProfessionCategoryId>("beauty");
  const [professionId, setProfessionId] = useState<ProfessionId>("tattoo_artist");

  const [search, setSearch] = useState("");
  const professions = useMemo(
    () =>
      (search.trim()
        ? PROFESSION_CATEGORIES.flatMap((c) => c.professionIds)
        : PROFESSION_CATEGORIES.find((c) => c.id === categoryId)?.professionIds || []
      )
        .filter(
          (id) =>
            !search.trim() ||
            normalizeProfessionSearch(professionSearchText(id)).includes(
              normalizeProfessionSearch(search),
            ),
        )
        .map((id) => PROFESSION_PACKS[id]),
    [categoryId, search],
  );

  if (step === "language") {
    return (
      <main className="pocket-app pocket-onboard" dir="rtl">
        <div className="pocket-shell" style={{ justifyContent: "center", gap: "1rem" }}>
          <div className="pocket-card" style={{ padding: "1.25rem" }}>
            <p
              className="pocket-kicker"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Languages size={16} aria-hidden /> UI / UX
            </p>
            <h1 className="pocket-title">انتخاب زبان / Language</h1>
            <p className="pocket-muted" style={{ marginTop: "0.6rem" }}>
              اول زبان برنامه را انتخاب کن.
            </p>
            <div style={{ display: "grid", gap: "0.65rem", marginTop: "1.1rem" }}>
              <button
                type="button"
                className="pocket-choice"
                aria-pressed={locale === "fa"}
                onClick={() => setLocale("fa")}
              >
                فارسی
              </button>
              <button
                type="button"
                className="pocket-choice"
                dir="ltr"
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                English
              </button>
            </div>
            <button
              type="button"
              className="pocket-btn pocket-btn-primary"
              style={{ width: "100%", marginTop: "1.2rem" }}
              onClick={() => setStep("profession")}
            >
              {locale === "en" ? "Continue" : "ادامه"}
              {locale === "en" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pocket-app pocket-onboard" dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="pocket-shell">
        <div className="pocket-card" style={{ padding: "1.25rem" }}>
          <p
            className="pocket-kicker"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <BriefcaseBusiness size={16} aria-hidden />
            {locale === "en" ? "Profession setup" : "تنظیم شغل"}
          </p>
          <h1 className="pocket-title">
            {locale === "en" ? "Choose your profession" : "انتخاب شغل / حرفه"}
          </h1>
          <p className="pocket-muted" style={{ marginTop: "0.55rem" }}>
            {locale === "en"
              ? "Menus and appointment fields will match this profession. Tattoo artist keeps the exact current setup."
              : "منوها و فیلدهای نوبت متناسب با این شغل تنظیم می‌شوند. برای تاتو آرتیست همان تنظیمات فعلی حفظ می‌شود."}
          </p>

          <input
            className="pocket-field"
            aria-label="جستجوی شغل"
            placeholder="جستجوی شغل در همه دسته‌ها…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "1rem" }}>
            {PROFESSION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="pocket-chip"
                aria-pressed={categoryId === cat.id}
                style={
                  categoryId === cat.id
                    ? {
                        background: "var(--pk-accent)",
                        color: "#fff",
                        borderColor: "var(--pk-accent)",
                      }
                    : undefined
                }
                onClick={() => {
                  setSearch("");
                  setCategoryId(cat.id);
                  const first = cat.professionIds[0];
                  if (first) setProfessionId(first);
                }}
              >
                {locale === "en" ? cat.nameEn : cat.nameFa}
              </button>
            ))}
          </div>

          <ul
            style={{
              listStyle: "none",
              margin: "1rem 0 0",
              padding: 0,
              display: "grid",
              gap: "0.5rem",
            }}
          >
            {professions.map((pack) => (
              <li key={pack.id}>
                <button
                  type="button"
                  className="pocket-choice"
                  aria-pressed={professionId === pack.id}
                  onClick={() => setProfessionId(pack.id)}
                >
                  {locale === "en" ? pack.nameEn : pack.nameFa}
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: "0.55rem", marginTop: "1.2rem" }}>
            <button
              type="button"
              className="pocket-btn pocket-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setStep("language")}
            >
              {locale === "en" ? "Back" : "بازگشت"}
            </button>
            <button
              type="button"
              className="pocket-btn pocket-btn-primary"
              style={{ flex: 2 }}
              onClick={() => onDone(locale, professionId)}
            >
              {locale === "en" ? "Start" : "شروع"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
