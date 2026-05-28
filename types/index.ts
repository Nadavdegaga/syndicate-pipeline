export type Brand = "all" | "nomi" | "startech" | "luminarix";

export const BRANDS: Brand[] = ["all", "nomi", "startech", "luminarix"];

export const BRAND_LABELS: Record<Brand, string> = {
  all: "All Brands",
  nomi: "Nomi",
  startech: "StarTech",
  luminarix: "Luminarix",
};
