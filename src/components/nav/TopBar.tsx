"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { DataSourceBadge } from "@/components/data/DataSourceBadge";

export function TopBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 md:px-10 h-14 bg-[color:var(--color-surface)]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="font-label text-[color:var(--color-on-surface-dim)] hidden sm:block">
          Precision Ledger · Freight Pricing
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DataSourceBadge />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}
