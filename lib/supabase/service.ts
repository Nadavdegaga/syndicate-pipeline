// Service-role Supabase client — bypasses RLS. Use ONLY in server-side code
// that needs admin APIs (auth.admin.listUsers, etc.). Never import this from
// a "use client" component.

import { createClient as createPlain } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServiceClient() {
  return createPlain<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
