"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/Button";

export function UploadDropzone({ onDone }: { onDone?: () => void }) {
  const { uploadCsv, status } = useData();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    await uploadCsv(text, file.name);
    onDone?.();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) await handleFile(file);
      }}
      className={`rounded-sm bg-[color:var(--color-surface-container-low)] p-8 flex flex-col items-center justify-center gap-3 text-center transition-colors ${
        dragging
          ? "shadow-[inset_0_0_0_1px_var(--color-primary-fixed)]"
          : "ghost-border"
      }`}
    >
      <UploadCloud
        className="size-8 text-[color:var(--color-on-surface-dim)]"
        aria-hidden
      />
      <div className="space-y-1">
        <p className="text-sm text-[color:var(--color-on-surface)]">
          Drop a CSV here, or browse
        </p>
        <p className="text-xs text-[color:var(--color-on-surface-dim)]">
          Your file stays on your machine. Parsed locally via DuckDB-Wasm.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={status === "loading"}
        >
          Browse file
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
