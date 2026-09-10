import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "accent" | "primary" | "danger";
  children: ReactNode;
}) {
  const tones = {
    muted: "bg-bg text-muted border-border",
    accent: "bg-accent/12 text-accent border-accent/20",
    primary: "bg-primary/10 text-primary border-primary/15",
    danger: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
