"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportAllButton() {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await fetch("/api/export", { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        let msg = `Export failed (${res.status})`;
        try {
          const json = JSON.parse(text);
          if (json.error) msg = json.error;
        } catch {}
        toast.error(msg);
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="?([^"]+)"?/)?.[1] ??
        `syndicate-export-${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error("Export failed: " + (e instanceof Error ? e.message : e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={download}
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export all data (ZIP)
    </Button>
  );
}
