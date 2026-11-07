import { Copy, MessageSquareText, Send } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { toSmsLink } from "@/lib/format";

export type SmsChoice = { kind: string; label: string; group?: string };

/**
 * Full-text SMS preview: pick a ready message, read/edit the FULL text, then copy it or open the phone's own
 * SMS app with it. Nothing is ever sent automatically; edits are for this message only.
 */
export function SmsComposer({
  phones, choices, build, honorificKinds = [], warnings, testId,
}: {
  phones: string[];
  choices: SmsChoice[];
  build: (kind: string, honorific?: "آقا" | "خانم") => string;
  honorificKinds?: string[];
  warnings?: (kind: string) => string[];
  testId?: string;
}) {
  const id = useId();
  const [kind, setKind] = useState<string | null>(null);
  const [honorific, setHonorific] = useState<"آقا" | "خانم" | undefined>(undefined);
  const [phone, setPhone] = useState(phones[0] || "");
  const generated = useMemo(() => (kind ? build(kind, honorific) : ""), [kind, honorific, build]);
  const [text, setText] = useState("");
  useEffect(() => setText(generated), [generated]);
  const href = phone && text ? toSmsLink(phone, text) : null;
  const groups = useMemo(() => {
    const m = new Map<string, SmsChoice[]>();
    for (const c of choices) m.set(c.group || "", [...(m.get(c.group || "") || []), c]);
    return [...m.entries()];
  }, [choices]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.getElementById(`${id}-text`) as HTMLTextAreaElement | null;
      area?.select();
      document.execCommand("copy");
    }
    toast.success("متن پیامک کپی شد.");
  }

  return (
    <div className="pocket-sms" data-testid={testId}>
      {groups.map(([group, items]) => (
        <div key={group} className="pocket-sms-group">
          {group ? <p className="pocket-sms-group-title">{group}</p> : null}
          <div className="pocket-sms-choices">
            {items.map((c) => (
              <button key={c.kind} type="button" data-sms={c.kind} aria-pressed={kind === c.kind}
                className={`pocket-sms-choice ${kind === c.kind ? "is-active" : ""}`}
                onClick={() => { setKind(c.kind); setHonorific(undefined); }}>
                <MessageSquareText size={16} aria-hidden /> {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {kind ? (
        <div className="pocket-sms-preview" data-testid="sms-preview">
          {honorificKinds.includes(kind) ? (
            <div className="pocket-sms-honorific" role="group" aria-label="آقا یا خانم">
              {(["آقا", "خانم"] as const).map((h) => (
                <button key={h} type="button" className={`pocket-btn ${honorific === h ? "pocket-btn-primary" : "pocket-btn-ghost"}`} onClick={() => setHonorific(h)}>{h}</button>
              ))}
            </div>
          ) : null}
          {phones.length > 1 ? (
            <label className="pocket-sms-phone">شماره
              <select className="pocket-field" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr">
                {phones.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          ) : null}
          {warnings?.(kind).map((w) => <p key={w} className="pocket-banner" role="status">{w}</p>)}
          <label htmlFor={`${id}-text`} className="pocket-sms-label">متن کامل پیامک (قبل از ارسال قابل ویرایش)</label>
          <textarea id={`${id}-text`} className="pocket-area pocket-sms-text" data-testid="sms-text" value={text}
            rows={Math.min(14, Math.max(4, text.split("\n").length + 2))} onChange={(e) => setText(e.target.value)} />
          <div className="pocket-sms-actions">
            {href ? (
              <a className="pocket-btn pocket-btn-primary" href={href} data-action="sms-template" data-testid="sms-open">
                <Send size={16} aria-hidden /> باز کردن در پیامک گوشی
              </a>
            ) : <p className="pocket-muted">شمارهٔ معتبر برای پیامک ثبت نشده است.</p>}
            <button type="button" className="pocket-btn pocket-btn-ghost" onClick={() => void copy()} data-testid="sms-copy">
              <Copy size={16} aria-hidden /> کپی متن
            </button>
          </div>
          <p className="pocket-muted pocket-sms-note">پیامک خودکار ارسال نمی‌شود؛ برنامهٔ پیامک گوشی باز می‌شود و ارسال را خودتان می‌زنید.</p>
        </div>
      ) : null}
    </div>
  );
}
