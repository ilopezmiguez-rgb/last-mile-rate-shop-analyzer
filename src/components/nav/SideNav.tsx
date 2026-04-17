"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Compass, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  code: string;
};

const items: Item[] = [
  {
    href: "/analyzer",
    label: "Analyzer",
    hint: "Segmented win-rate surface",
    icon: Activity,
    code: "ANL",
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    hint: "Recoverable lanes, ranked",
    icon: Compass,
    code: "OPP",
  },
  {
    href: "/recommendations",
    label: "Pricing",
    hint: "Per-segment price moves",
    icon: Target,
    code: "REC",
  },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-[color:var(--color-surface-container-low)] px-3 py-4 gap-1">
      <div className="flex items-center gap-2 px-2 pt-1 pb-5">
        <LogoMark />
        <div className="flex flex-col leading-tight">
          <span className="font-headline text-sm">Rate Shop</span>
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Analyzer · v1
          </span>
        </div>
      </div>

      <div className="font-label text-[color:var(--color-on-surface-dim)] px-2 pb-2">
        Workspace
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-start gap-3 rounded-sm px-2 py-2 text-sm transition-colors",
              "text-[color:var(--color-on-surface-muted)] hover:text-[color:var(--color-on-surface)]",
              active &&
                "bg-[color:var(--color-surface-container)] text-[color:var(--color-on-surface)]"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all",
                active
                  ? "bg-[color:var(--color-primary-fixed)]"
                  : "bg-transparent group-hover:bg-[color:var(--color-outline-variant)]"
              )}
            />
            <Icon className="size-4 mt-0.5 shrink-0" aria-hidden />
            <span className="flex flex-col leading-tight flex-1">
              <span className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <span className="font-label text-[0.625rem] text-[color:var(--color-on-surface-dim)]">
                  {item.code}
                </span>
              </span>
              <span className="text-[0.6875rem] text-[color:var(--color-on-surface-dim)] mt-0.5">
                {item.hint}
              </span>
            </span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <div className="px-2 py-3 rounded-sm bg-[color:var(--color-surface-container)]">
        <div className="font-label text-[color:var(--color-on-surface-dim)]">Runtime</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]" />
          <span className="text-xs text-[color:var(--color-on-surface-muted)]">
            DuckDB-Wasm · in-browser
          </span>
        </div>
      </div>
    </aside>
  );
}

function LogoMark() {
  return (
    <div
      className="size-8 rounded-xs flex items-center justify-center cta-primary"
      aria-hidden
    >
      <span className="font-mono text-[0.6875rem] font-semibold tracking-tighter">
        RS
      </span>
    </div>
  );
}
