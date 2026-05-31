import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, public assets
     * - /api/auth (Supabase callback)
     * - /api/cron (Vercel Cron — auth via CRON_SECRET header instead)
     * - /api/ingest (server-to-server ingest — auth via X-API-Key header instead)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/cron|api/ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
