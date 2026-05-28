"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { useRouter } from "next/navigation";
import { BRANDS, type Brand } from "@/types";

const STORAGE_KEY = "syndicate.activeBrand";
const COOKIE_KEY = "syndicate_brand";

type BrandContextValue = {
  brand: Brand;
  setBrand: (b: Brand) => void;
};

const BrandContext = createContext<BrandContextValue | null>(null);

function writeCookie(value: string) {
  if (typeof document === "undefined") return;
  // 1 year, path=/, SameSite=Lax — readable by server during SSR
  document.cookie = `${COOKIE_KEY}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function BrandProvider({
  children,
  initialBrand = "all",
}: {
  children: ReactNode;
  initialBrand?: Brand;
}) {
  const [brand, setBrandState] = useState<Brand>(initialBrand);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (BRANDS as string[]).includes(stored)) {
      const b = stored as Brand;
      setBrandState(b);
      writeCookie(b);
    } else {
      writeCookie(initialBrand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBrand = useCallback(
    (b: Brand) => {
      setBrandState(b);
      window.localStorage.setItem(STORAGE_KEY, b);
      writeCookie(b);
      // Re-render server components that read the brand cookie
      router.refresh();
    },
    [router],
  );

  return createElement(
    BrandContext.Provider,
    { value: { brand, setBrand } },
    children,
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used inside BrandProvider");
  return ctx;
}
