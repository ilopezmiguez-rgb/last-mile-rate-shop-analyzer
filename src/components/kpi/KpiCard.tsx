"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface KpiCardProps {
  code?: string;
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; direction: "up" | "down"; tone?: "good" | "bad" | "neutral" };
  icon?: LucideIcon;
  accent?: "primary" | "gold" | "success" | "danger" | "neutral";
  className?: string;
}

const accentStyle: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "from-[color:var(--color-primary-fixed)]/14 to-transparent",
  gold: "from-[color:var(--color-secondary)]/18 to-transparent",
  success: "from-[color:var(--color-success)]/15 to-transparent",
  danger: "from-[color:var(--color-danger)]/15 to-transparent",
  neutral: "from-transparent to-transparent",
};

export function KpiCard({
  code,
  label,
  value,
  hint,
  delta,
  icon: Icon,
  accent = "neutral",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[color:var(--color-surface-container)] px-4 py-3.5 flex flex-col gap-1.5",
        "ghost-border",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-80 pointer-events-none",
          accentStyle[accent]
        )}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="font-label text-[color:var(--color-on-surface-dim)] tracking-[0.1em]">
          {code ? `${code} · ` : ""}
          {label}
        </span>
        {Icon && (
          <Icon className="size-3.5 text-[color:var(--color-on-surface-dim)]" aria-hidden />
        )}
      </div>
      <div className="relative flex items-baseline gap-2">
        <span className="font-mono text-2xl text-[color:var(--color-on-surface)] tracking-tight">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-mono",
              delta.tone === "good"
                ? "text-[color:var(--color-success)]"
                : delta.tone === "bad"
                ? "text-[color:var(--color-danger)]"
                : "text-[color:var(--color-on-surface-muted)]"
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      {hint && (
        <span className="relative text-[0.75rem] text-[color:var(--color-on-surface-muted)]">
          {hint}
        </span>
      )}
    </div>
  );
}
