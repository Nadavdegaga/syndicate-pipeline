import { cookies } from "next/headers";
import { BRANDS, type Brand } from "@/types";

const COOKIE_KEY = "syndicate_brand";

export function getServerBrand(): Brand {
  const value = cookies().get(COOKIE_KEY)?.value;
  if (value && (BRANDS as string[]).includes(value)) {
    return value as Brand;
  }
  return "all";
}
