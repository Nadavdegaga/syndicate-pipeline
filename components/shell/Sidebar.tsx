"use client";

import Link from "next/link";
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
  LineChart,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBrand } from "@/hooks/useBrand";
import { BrandSwitcher } from "./BrandSwitcher";
import { BRAND_COLORS } from "@/lib/utils/brand";
import type { Brand } from "@/types";

type NavItem  = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// Static groups — never change regardless of brand
const OVERVIEW_GROUP: NavGroup = {
  label: "Overview",
  items: [
    { href: "/insights", label: "Insights",       icon: BarChart3      },
    { href: "/ask",      label: "Ask",             icon: MessageCircle  },
    { href: "/today",    label: "Today",           icon: Target         },
  ],
};

const DATA_GROUP: NavGroup = {
  label: "Data",
  items: [
    { href: "/contacts",  label: "Contacts",  icon: Users      },
    { href: "/networks",  label: "Networks",  icon: Radio      },
    { href: "/offers",    label: "Offers",    icon: Briefcase  },
    { href: "/wishlists", label: "Wishlists", icon: Handshake  },
    { href: "/demand",    label: "Demand",    icon: TrendingUp },
  ],
};

const TOOLS_GROUP: NavGroup = {
  label: "Tools",
  items: [
    { href: "/matchmaker",      label: "MatchMaker",      icon: Search   },
    { href: "/external-offers", label: "External Offers", icon: Globe    },
    { href: "/import",          label: "Import",          icon: Upload   },
    { href: "/settings",        label: "Settings",        icon: Settings },
  ],
};

function getReportingItems(brand: Brand): NavItem[] {
  const luminarix: NavItem = { href: "/reporting/affise",   label: "Luminarix",    icon: LineChart };
  const nomi:      NavItem = { href: "/reporting/nomi",     label: "Nomi",         icon: LineChart };
  const st:        NavItem = { href: "/reporting/startech", label: "StarTech",     icon: LineChart };
  const bi:        NavItem = { href: "/reporting/bi",       label: "Advanced BI",  icon: Sparkles  };
  switch (brand) {
    case "nomi":      return [nomi, bi];
    case "startech":  return [st, bi];
    case "luminarix": return [luminarix, bi];
    default:          return [luminarix, nomi, st, bi];
  }
}

function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function tourKeyFor(href: string): string {
  return "nav-" + href.replace(/^\//, "").replace(/\//g, "-");
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const colors = BRAND_COLORS[brand];
  const initials = initialsFromEmail(userEmail);

  const reportingGroup: NavGroup = {
    label: "Reporting",
    items: getReportingItems(brand),
  };
  const groups = [OVERVIEW_GROUP, DATA_GROUP, reportingGroup, TOOLS_GROUP];

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white md:border-l-4 transition-colors duration-300",
        colors.sidebarBorder,
      )}
    >
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900">
              Syndicate Pipeline
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              v0.2 · EPIC 4
            </div>
          </div>
        </div>
      </div>

      {/* Brand Switcher */}
      <div className="pb-4">
        <BrandSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={tourKeyFor(item.href)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-slate-900 font-medium text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-700",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-slate-800 text-xs font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">
              {userEmail?.split("@")[0] ?? "—"}
            </div>
            <div
              className="truncate text-xs text-slate-500"
              title={userEmail ?? ""}
            >
              {userEmail ?? ""}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
