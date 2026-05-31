"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        data-tour="feedback-button"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
