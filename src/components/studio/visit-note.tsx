import { STUDIO_ADDRESS, STUDIO_CONTACT_PHONE } from "@/lib/tattoo-flow";

export function StudioVisitNote({ tone = "light" }: { tone?: "light" | "dark" }) {
  const box =
    tone === "dark"
      ? "mt-3 rounded-xl border border-[#b7955b]/25 bg-[#b7955b]/10 p-3 text-[#e5d2ae]"
      : "mt-3 rounded-xl border border-border bg-bg p-3 text-fg";
  const muted = tone === "dark" ? "text-white/55" : "text-muted";
  return (
    <div className={box}>
      <p className="font-semibold">آدرس استودیو</p>
      <p className="mt-1 text-sm leading-7">{STUDIO_ADDRESS}</p>
      <a className={`mt-1 block text-sm font-bold ${muted}`} href={`tel:+98${STUDIO_CONTACT_PHONE.slice(1)}`} dir="ltr">
        {STUDIO_CONTACT_PHONE}
      </a>
    </div>
  );
}
