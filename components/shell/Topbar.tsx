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
  LineChart,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";
// import { BrandSwitcher } from "./BrandSwitcher";
import { HelpButton } from "./HelpButton";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { useBrand } from "@/hooks/useBrand";
import { BRAND_COLORS } from "@/lib/utils/brand";
import { BRAND_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const META: Record<string, { title: string; icon: LucideIcon }> = {
  "/insights":            { title: "Insights",           icon: BarChart3     },
  "/ask":                 { title: "Ask",                icon: MessageCircle },
  "/today":               { title: "Today's Actions",    icon: Target        },
  "/contacts":            { title: "Contacts",           icon: Users         },
  "/networks":            { title: "Networks",           icon: Radio         },
  "/offers":              { title: "Offers",             icon: Briefcase     },
  "/wishlists":           { title: "Wishlists",          icon: Handshake     },
  "/demand":              { title: "Network Demand",     icon: TrendingUp    },
  "/matchmaker":          { title: "MatchMaker",         icon: Search        },
  "/external-offers":     { title: "External Offers",    icon: Globe         },
  "/import":              { title: "Import",             icon: Upload        },
  "/settings":            { title: "Settings",           icon: Settings      },
  "/reporting/affise":    { title: "Luminarix Reporting", icon: LineChart     },
  "/reporting/nomi":      { title: "Nomi Reporting",     icon: LineChart     },
  "/reporting/startech":  { title: "StarTech Reporting", icon: LineChart     },
  "/reporting/bi":        { title: "Advanced BI",        icon: Sparkles      },
  "/reporting":           { title: "Reporting",          icon: LineChart     },
};

export function Topbar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const colors = BRAND_COLORS[brand];

  const segments = pathname.split("/").filter(Boolean);
  const twoSeg = segments.length >= 2 ? "/" + segments.slice(0, 2).join("/") : "";
  const topSeg = "/" + (segments[0] ?? "");
  const meta = META[twoSeg] ?? META[topSeg] ?? { title: "Syndicate Pipeline", icon: BarChart3 };
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
        {/* Read-only brand indicator — switching happens in the sidebar */}
        <div
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex",
            colors.badgeBg,
            colors.badgeText,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
          {BRAND_LABELS[brand]}
        </div>
        {/* <BrandSwitcher /> */}
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
