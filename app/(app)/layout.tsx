import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import type { Brand } from "@/types";
import { BRANDS } from "@/types";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metaDefault = user.user_metadata?.default_brand as string | undefined;
  const initialBrand: Brand = (BRANDS as string[]).includes(metaDefault ?? "")
    ? (metaDefault as Brand)
    : "all";

  return (
    <AppShell userEmail={user.email ?? null} initialBrand={initialBrand}>
      {children}
    </AppShell>
  );
}
