import type { Brand } from "@/types";

export const BRAND_COLORS: Record<
  Brand,
  {
    accent: string;
    bg: string;
    border: string;
    sidebarBorder: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
    buttonActive: string;
    buttonHover: string;
  }
> = {
  all: {
    accent: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    sidebarBorder: "border-slate-400",
    dot: "bg-slate-500",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    buttonActive: "bg-slate-900 text-white shadow-sm",
    buttonHover: "hover:bg-slate-100 hover:text-slate-900",
  },
  nomi: {
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    sidebarBorder: "border-blue-600",
    dot: "bg-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    buttonActive: "bg-blue-600 text-white shadow-sm",
    buttonHover: "hover:bg-blue-50 hover:text-blue-700",
  },
  startech: {
    accent: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    sidebarBorder: "border-amber-500",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    buttonActive: "bg-amber-500 text-white shadow-sm",
    buttonHover: "hover:bg-amber-50 hover:text-amber-700",
  },
  luminarix: {
    accent: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    sidebarBorder: "border-violet-600",
    dot: "bg-violet-600",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    buttonActive: "bg-violet-600 text-white shadow-sm",
    buttonHover: "hover:bg-violet-50 hover:text-violet-700",
  },
};

/** Map a brand to its status column on contacts. */
export function statusFieldFor(
  brand: Brand,
): "status_nomi" | "status_startech" | "status_luminarix" | null {
  if (brand === "nomi") return "status_nomi";
  if (brand === "startech") return "status_startech";
  if (brand === "luminarix") return "status_luminarix";
  return null;
}

/** Active brand fields to check; "all" means inspect all three. */
export function activeStatusFields(
  brand: Brand,
): Array<"status_nomi" | "status_startech" | "status_luminarix"> {
  if (brand === "all") return ["status_nomi", "status_startech", "status_luminarix"];
  return [statusFieldFor(brand)!];
}
