"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/Button";

export function BootingState() {
  const { status } = useData();
  return (
    <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
      <div className="size-14 rounded-md cta-primary flex items-center justify-center">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
      <div>
        <div className="font-headline text-lg">
          {status === "booting" ? "Booting DuckDB-Wasm" : "Loading demo dataset"}
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-on-surface-muted)] max-w-md">
          Engine initializing in your browser. First load is ~1s on a mid-range laptop;
          subsequent queries run at native SQL speed.
        </p>
      </div>
      <div className="flex items-center gap-2 font-label text-[color:var(--color-on-surface-dim)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-primary-fixed)] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--color-primary-fixed)]" />
        </span>
        warming up
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const { resetToDemo } = useData();
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh] text-center">
      <AlertTriangle className="size-8 text-[color:var(--color-danger)]" />
      <div>
        <div className="font-headline text-lg">Something went sideways</div>
        <p className="mt-1 text-sm text-[color:var(--color-on-surface-muted)] max-w-md font-mono">
          {message}
        </p>
      </div>
      <Button variant="secondary" onClick={() => void resetToDemo()}>
        Reset to demo data
      </Button>
    </div>
  );
}

export function ViewSkeleton({ rows = 6, height = 200 }: { rows?: number; height?: number }) {
  return (
    <div
      className="animate-pulse rounded-md bg-[color:var(--color-surface-container-low)] ghost-border"
      style={{ height }}
      aria-hidden
    >
      <div className="sr-only">Loading…</div>
      <div className="h-full flex flex-col justify-center gap-2 px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded-xs bg-[color:var(--color-surface-container)]"
            style={{ width: `${60 + ((i * 13) % 35)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
