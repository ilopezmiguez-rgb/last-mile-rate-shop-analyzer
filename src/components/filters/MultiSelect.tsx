"use client";

import { Command } from "cmdk";
import { Check, ChevronDown, Search, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export type Option = {
  value: string;
  label: string;
  hint?: string;
};

type MultiSelectProps = {
  label: string;
  icon: LucideIcon;
  options: Option[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxListHeight?: number;
  loading?: boolean;
  valueFormatter?: (v: string) => string;
};

export function MultiSelect({
  label,
  icon: Icon,
  options,
  values,
  onChange,
  placeholder = "Search…",
  maxListHeight = 280,
  loading,
  valueFormatter = (v) => v,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(values), [values]);

  const filtered = useMemo(() => {
    if (!q) return options;
    const ql = q.toLowerCase();
    return options.filter(
      (o) =>
        o.value.toLowerCase().includes(ql) ||
        o.label.toLowerCase().includes(ql)
    );
  }, [options, q]);

  const toggle = (v: string) => {
    if (selectedSet.has(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-sm text-sm",
            "bg-[color:var(--color-surface-container-low)] ghost-border",
            "hover:bg-[color:var(--color-surface-container)] transition-colors",
            "data-[state=open]:bg-[color:var(--color-surface-container)]",
            values.length > 0 && "shadow-[inset_0_0_0_1px_var(--color-primary-fixed)]"
          )}
          data-state={open ? "open" : "closed"}
        >
          <Icon
            className="size-3.5 text-[color:var(--color-on-surface-muted)]"
            aria-hidden
          />
          <span className="font-label text-[color:var(--color-on-surface-muted)]">
            {label}
          </span>
          {values.length > 0 && (
            <Badge tone="primary">
              {values.length === 1 ? valueFormatter(values[0]) : `${values.length}`}
            </Badge>
          )}
          <ChevronDown
            className="size-3.5 text-[color:var(--color-on-surface-dim)] group-hover:text-[color:var(--color-on-surface-muted)] ml-0.5"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command className="flex flex-col">
          <div className="flex items-center gap-2 px-3 h-9 bg-[color:var(--color-surface-container)] rounded-t-md">
            <Search
              className="size-3.5 text-[color:var(--color-on-surface-dim)]"
              aria-hidden
            />
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--color-on-surface-dim)]"
            />
            {values.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[0.6875rem] font-mono text-[color:var(--color-on-surface-muted)] hover:text-[color:var(--color-on-surface)]"
              >
                CLEAR
              </button>
            )}
          </div>
          <Command.List
            className="overflow-y-auto p-1"
            style={{ maxHeight: maxListHeight }}
          >
            <Command.Empty className="p-3 text-xs text-[color:var(--color-on-surface-dim)]">
              {loading ? "Loading…" : "No matches."}
            </Command.Empty>
            {filtered.map((o) => {
              const checked = selectedSet.has(o.value);
              return (
                <Command.Item
                  key={o.value}
                  value={`${o.value} ${o.label}`}
                  onSelect={() => toggle(o.value)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xs px-2 h-8 text-sm cursor-pointer",
                    "text-[color:var(--color-on-surface)]",
                    "aria-selected:bg-[color:var(--color-surface-container-high)]",
                    "data-[selected=true]:bg-[color:var(--color-surface-container-high)]"
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[0.8125rem] truncate">
                      {o.label}
                    </span>
                    {o.hint && (
                      <span className="text-[0.6875rem] text-[color:var(--color-on-surface-dim)] font-mono truncate">
                        {o.hint}
                      </span>
                    )}
                  </span>
                  {checked && (
                    <Check
                      className="size-3.5 text-[color:var(--color-primary-fixed)]"
                      aria-hidden
                    />
                  )}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
