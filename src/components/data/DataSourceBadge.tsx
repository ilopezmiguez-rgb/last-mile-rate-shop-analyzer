"use client";

import { Database, RefreshCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { UploadDropzone } from "@/components/data/UploadDropzone";
import { formatCount } from "@/lib/format";

export function DataSourceBadge() {
  const { status, source, meta, error, resetToDemo } = useData();
  const [open, setOpen] = useState(false);
  const lastSource = useRef(source);
  if (source !== lastSource.current) lastSource.current = source;

  const ready = status === "ready" || status === "loading";
  const label =
    source === "demo" ? "Demo data" : (meta?.fileName ?? "Uploaded CSV");

  return (
    <>
      <div className="flex items-center gap-2 pl-3 pr-2 h-8 rounded-sm bg-[color:var(--color-surface-container-low)] ghost-border">
        <Database
          className={`size-3.5 ${
            ready
              ? "text-[color:var(--color-primary-fixed)]"
              : "text-[color:var(--color-on-surface-dim)]"
          }`}
          aria-hidden
        />
        <span className="font-label text-[color:var(--color-on-surface-muted)]">
          {status === "booting"
            ? "Booting engine…"
            : status === "loading"
            ? "Loading…"
            : status === "error"
            ? "Error"
            : label}
        </span>
        {meta && status !== "booting" && (
          <span className="text-[0.6875rem] font-mono text-[color:var(--color-on-surface-dim)]">
            · {formatCount(meta.rows)} rows
          </span>
        )}
        <div className="mx-1 w-px h-4 bg-[color:var(--color-outline-variant)]/30" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label="Upload CSV"
        >
          <Upload />
        </Button>
        {source === "uploaded" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void resetToDemo()}
            aria-label="Reset to demo data"
          >
            <RefreshCcw />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload a dataset</DialogTitle>
            <DialogDescription>
              CSV with columns: record_type, bt_shipment_id, origin_zipcode,
              destination_metro_code, weight, distance, total_charge, record_date.
            </DialogDescription>
          </DialogHeader>
          <UploadDropzone onDone={() => setOpen(false)} />
          {error && (
            <div className="mt-3 rounded-sm bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs text-[color:var(--color-danger)] font-mono">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
