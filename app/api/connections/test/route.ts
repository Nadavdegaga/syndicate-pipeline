// Test-connection endpoint used by the Add Connection wizard's Step 4.
// Accepts the raw form values (NOT encrypted yet) and runs platform.testConnection.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformClient,
  type PlatformKind,
  PLATFORM_KINDS,
} from "@/lib/platforms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  platform: PlatformKind;
  base_url: string;
  api_key: string;
  api_secret?: string | null;
  extra_config?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!PLATFORM_KINDS.includes(body.platform)) {
    return NextResponse.json(
      { error: `Unknown platform: ${body.platform}` },
      { status: 400 },
    );
  }
  if (!body.api_key) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  const client = getPlatformClient(body.platform);
  const result = await client.testConnection({
    baseUrl: body.base_url ?? "",
    apiKey: body.api_key,
    apiSecret: body.api_secret ?? null,
    extraConfig: body.extra_config ?? undefined,
  });

  return NextResponse.json(result);
}
