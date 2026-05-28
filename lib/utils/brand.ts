import type { Brand } from "@/types";

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
