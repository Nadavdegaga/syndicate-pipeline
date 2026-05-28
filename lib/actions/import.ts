"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportTable = "contacts" | "networks" | "offers" | "wishlists" | "demand";

export type ImportRow = Record<string, string | number | boolean | null>;

type Result =
  | { ok: true; inserted: number; skipped: number; batchId: string }
  | { ok: false; error: string };

const BATCH_SIZE = 100;

function batchTag(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `import-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const TABLE_MAP: Record<ImportTable, string> = {
  contacts: "contacts",
  networks: "networks",
  offers: "offers",
  wishlists: "publisher_wishlists",
  demand: "network_demand",
};

const REQUIRED: Record<ImportTable, string[]> = {
  contacts: ["name"],
  networks: ["name"],
  offers: ["name"],
  wishlists: ["requested_offer"],
  demand: ["offer_name"],
};

const ALLOWED_FIELDS: Record<ImportTable, string[]> = {
  contacts: [
    "name", "role", "company", "channel", "linkedin_url", "telegram",
    "email", "other_contact", "status_nomi", "status_startech",
    "status_luminarix", "notes",
  ],
  networks: ["name", "tier", "login_url", "registration_url", "linkedin_url", "notes"],
  offers: [
    "name", "vertical", "traffic_sources", "payout", "preview_link",
    "status", "kpi_notes", "network_name",
  ],
  wishlists: ["publisher_name", "requested_offer", "vertical", "link_or_network", "notes"],
  demand: ["network_name", "offer_name", "vertical", "link", "payout", "notes"],
};

function sanitize(table: ImportTable, row: ImportRow): ImportRow {
  const allowed = ALLOWED_FIELDS[table];
  const out: ImportRow = {};
  for (const k of allowed) {
    if (k in row) {
      const v = row[k];
      out[k] = v === undefined ? null : v;
    }
  }
  return out;
}

export async function bulkImport(
  table: ImportTable,
  rows: ImportRow[],
): Promise<Result> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "No rows to import" };
  }
  const required = REQUIRED[table];
  const tableName = TABLE_MAP[table];

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const batchId = batchTag();

  // Validate rows
  const validRows: ImportRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const missing = required.find((field) => {
      const v = row[field];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing) {
      skipped++;
      continue;
    }
    const clean = sanitize(table, row);
    clean.source = batchId;
    if (table === "contacts" && user) clean.created_by = user.id;
    validRows.push(clean);
  }

  if (validRows.length === 0) {
    return { ok: false, error: "All rows failed validation" };
  }

  // Networks upsert by name (SPEC §17); others plain insert
  let totalInserted = 0;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const slice = validRows.slice(i, i + BATCH_SIZE);
    let result;
    if (table === "networks") {
      result = await supabase
        .from(tableName)
        .upsert(slice, { onConflict: "name", ignoreDuplicates: false })
        .select("id");
    } else {
      result = await supabase.from(tableName).insert(slice).select("id");
    }
    if (result.error) return { ok: false, error: result.error.message };
    totalInserted += result.data?.length ?? slice.length;
  }

  revalidatePath("/" + table);
  return { ok: true, inserted: totalInserted, skipped, batchId };
}

export async function undoImport(
  table: ImportTable,
  batchId: string,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const supabase = createClient();
  const tableName = TABLE_MAP[table];
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq("source", batchId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/" + table);
  return { ok: true, deleted: data?.length ?? 0 };
}
