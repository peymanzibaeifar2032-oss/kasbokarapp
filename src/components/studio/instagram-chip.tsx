import { toast } from "sonner";
import { instagramProfileUrl, normalizeInstagramHandle } from "@/lib/format";

export function InstagramChip({ handle }: { handle: string }) {
  const clean = normalizeInstagramHandle(handle);
  const href = instagramProfileUrl(handle);
  if (!clean || !href) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(clean);
      toast.success("آیدی اینستاگرام کپی شد.");
    } catch {
      toast.error("کپی نشد. آیدی را دستی انتخاب کن.");
    }
  }

  return (
    <span className="mt-1 inline-flex flex-wrap items-center gap-2" dir="ltr">
      <a className="text-sm font-semibold text-accent underline" href={href} target="_blank" rel="noreferrer">
        @{clean}
      </a>
      <button type="button" className="rounded-lg border border-border px-2 py-1 text-xs" onClick={() => void copy()}>
        کپی
      </button>
    </span>
  );
}
