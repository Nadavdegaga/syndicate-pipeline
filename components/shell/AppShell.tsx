"use client";

import type { ReactNode } from "react";
import { BrandProvider } from "@/hooks/useBrand";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TourLauncher } from "./TourLauncher";
import type { Brand } from "@/types";

export function AppShell({
  children,
  userEmail,
  initialBrand,
}: {
  children: ReactNode;
  userEmail: string | null;
  initialBrand: Brand;
}) {
  return (
    <BrandProvider initialBrand={initialBrand}>
      <TourLauncher />
      <div className="flex min-h-screen bg-slate-50/60">
        <Sidebar userEmail={userEmail} />
        <div className="flex flex-1 flex-col">
          <Topbar userEmail={userEmail} />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </div>
      </div>
    </BrandProvider>
  );
}
