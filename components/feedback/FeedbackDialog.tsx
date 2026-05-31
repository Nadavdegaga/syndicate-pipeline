"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Bug, HelpCircle, Lightbulb, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBrand } from "@/hooks/useBrand";
import { createFeedback, type FeedbackCategory } from "@/lib/actions/feedback";

const CATEGORIES: {
  value: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  iconColor: string;
}[] = [
  { value: "bug", label: "Bug", icon: Bug, bg: "bg-red-50", iconColor: "text-red-600" },
  {
    value: "confusion",
    label: "Confusing",
    icon: HelpCircle,
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    value: "missing_feature",
    label: "Missing feature",
    icon: Sparkles,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    value: "other",
    label: "Other",
    icon: MessageSquare,
    bg: "bg-slate-50",
    iconColor: "text-slate-600",
  },
];

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!message.trim()) {
      toast.error("Add a short message before sending");
      return;
    }
    startTransition(async () => {
      const r = await createFeedback({
        category,
        message,
        page_url: pathname,
        brand,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Thanks! We'll review.");
      setMessage("");
      setCategory("bug");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what&apos;s broken, confusing, or missing. We read every one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500">
              Category
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all",
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md",
                        active ? "bg-white/15 text-white" : c.bg + " " + c.iconColor,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-xs uppercase tracking-wider text-slate-500">
              Message
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, what did you expect, anything else we should know?"
              rows={5}
              disabled={pending}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <p className="text-[11px] text-slate-400">
              Auto-captures the current page ({pathname}) and brand ({brand}).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
