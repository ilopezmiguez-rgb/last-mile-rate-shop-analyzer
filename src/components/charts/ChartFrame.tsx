"use client";

import { Table } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type ChartFrameProps = {
  title: string;
  howToRead: string;
  code?: string;
  actions?: React.ReactNode;
  tableFallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
};

export function ChartFrame({
  title,
  howToRead,
  code,
  actions,
  tableFallback,
  children,
  className,
  loading,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className={cn(
        "rounded-md bg-[color:var(--color-surface-container-low)] ghost-border p-4 md:p-5 flex flex-col gap-3",
        className
      )}
      aria-label={title}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {code && (
              <span className="font-label text-[color:var(--color-on-surface-dim)]">
                {code}
              </span>
            )}
            <h2 className="font-headline text-base md:text-lg text-[color:var(--color-on-surface)] truncate">
              {title}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[color:var(--color-on-surface-muted)] max-w-xl">
            {howToRead}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {tableFallback && (
            <Button
              variant={showTable ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setShowTable((s) => !s)}
              aria-label={showTable ? "Show chart" : "View as table"}
              aria-pressed={showTable}
            >
              <Table />
            </Button>
          )}
        </div>
      </header>

      <div
        className={cn(
          "min-h-[120px] relative",
          loading && "opacity-60 transition-opacity"
        )}
        role="img"
        aria-label={`${title}: ${howToRead}`}
      >
        {showTable && tableFallback ? tableFallback : children}
      </div>
    </section>
  );
}
