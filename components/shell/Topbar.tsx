"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  MessageCircle,
  Target,
  Users,
  Radio,
  Briefcase,
  Handshake,
  TrendingUp,
  Search,
  Upload,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { BrandSwitcher } from "./BrandSwitcher";
import { HelpButton } from "./HelpButton";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

const META: Record<string, { title: string; icon: LucideIcon }> = {
  "/insights": { title: "Insights", icon: BarChart3 },
  "/ask": { title: "Ask", icon: MessageCircle },
  "/today": { title: "Today's Actions", icon: Target },
  "/contacts": { title: "Contacts", icon: Users },
  "/networks": { title: "Networks", icon: Radio },
  "/offers": { title: "Offers", icon: Briefcase },
  "/wishlists": { title: "Wishlists", icon: Handshake },
  "/demand": { title: "Network Demand", icon: TrendingUp },
  "/matchmaker": { title: "MatchMaker", icon: Search },
  "/import": { title: "Import", icon: Upload },
  "/settings": { title: "Settings", icon: Settings },
};

export function Topbar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const top = "/" + pathname.split("/")[1];
  const meta = META[top] ?? { title: "Syndicate Pipeline", icon: BarChart3 };
  const Icon = meta.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-slate-900">
            {meta.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <BrandSwitcher />
        <FeedbackButton />
        <HelpButton />
        <div className="hidden text-xs text-slate-500 md:block">{userEmail}</div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-900"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
