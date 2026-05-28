import { Briefcase, Send, Mail, MessageSquare, HelpCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/supabase/types";

const CHANNEL_CONFIG: Record<
  NonNullable<Channel>,
  { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; label: string }
> = {
  LinkedIn: { icon: Briefcase, bg: "bg-blue-100", text: "text-blue-700", label: "LinkedIn" },
  Telegram: { icon: Send, bg: "bg-cyan-100", text: "text-cyan-700", label: "Telegram" },
  Teams: { icon: Users, bg: "bg-violet-100", text: "text-violet-700", label: "Teams" },
  Skype: { icon: MessageSquare, bg: "bg-sky-100", text: "text-sky-700", label: "Skype" },
  Email: { icon: Mail, bg: "bg-slate-100", text: "text-slate-700", label: "Email" },
  Unknown: { icon: HelpCircle, bg: "bg-slate-50", text: "text-slate-400", label: "Unknown" },
};

export function ChannelIcon({
  channel,
  withLabel = true,
}: {
  channel: Channel;
  withLabel?: boolean;
}) {
  const config = CHANNEL_CONFIG[channel ?? "Unknown"];
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md",
          config.bg,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", config.text)} />
      </span>
      {withLabel && (
        <span className="text-sm text-slate-600">{config.label}</span>
      )}
    </span>
  );
}
