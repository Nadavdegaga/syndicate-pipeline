"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWelcomeTour } from "@/lib/tour";

export function HelpButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-900"
      aria-label="Replay welcome tour"
      title="Replay welcome tour"
      onClick={() => startWelcomeTour()}
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}
