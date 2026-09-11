import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

function errorMessage(error: unknown): string {
  const s = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/Failed to fetch|NetworkError|Load failed/i.test(s)) {
    return "ارتباط با سرور برقرار نشد. صفحه را دوباره باز کنید.";
  }
  return s.trim() || "یک مشکل پیش آمد. صفحه را دوباره باز کنید.";
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">صفحه الان باز نشد</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <button
        type="button"
        className="mt-2 h-11 rounded-full bg-primary px-5 text-sm text-primary-fg"
        onClick={() => window.location.reload()}
      >
        تلاش دوباره
      </button>
    </main>
  );
}
