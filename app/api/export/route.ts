import { NextResponse } from "next/server";
import Papa from "papaparse";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  { name: "networks", file: "networks.csv" },
  { name: "contacts", file: "contacts.csv" },
  { name: "offers", file: "offers.csv" },
  { name: "publisher_wishlists", file: "publisher_wishlists.csv" },
  { name: "network_demand", file: "network_demand.csv" },
  { name: "activity_log", file: "activity_log.csv" },
] as const;

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const zip = new JSZip();
  const summary: Record<string, number> = {};

  for (const t of TABLES) {
    // Fetch in batches in case any table grows past the default 1000 cap
    const all: Record<string, unknown>[] = [];
    let from = 0;
    const batch = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from(t.name)
        .select("*")
        .range(from, from + batch - 1);
      if (error) {
        return NextResponse.json(
          { error: `Reading ${t.name}: ${error.message}` },
          { status: 500 },
        );
      }
      const rows = data ?? [];
      all.push(...rows);
      if (rows.length < batch) break;
      from += batch;
    }
    summary[t.name] = all.length;
    const csv = Papa.unparse(all, { newline: "\n" });
    zip.file(t.file, csv);
  }

  // Manifest with summary
  const manifest = {
    exported_at: new Date().toISOString(),
    exported_by: user.email,
    counts: summary,
    total_rows: Object.values(summary).reduce((a, b) => a + b, 0),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const ab = (await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })) as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/zip" });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="syndicate-pipeline-export-${todayStamp()}.zip"`,
      "Content-Length": String(ab.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
