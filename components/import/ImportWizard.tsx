"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  bulkImport,
  undoImport,
  type ImportTable,
} from "@/lib/actions/import";

type ParsedFile = {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
};

const TABLE_INFO: Record<
  ImportTable,
  { label: string; required: string[]; fields: { key: string; label: string }[] }
> = {
  contacts: {
    label: "Contacts",
    required: ["name"],
    fields: [
      { key: "name", label: "Name (required)" },
      { key: "role", label: "Role" },
      { key: "company", label: "Company" },
      { key: "channel", label: "Channel" },
      { key: "email", label: "Email" },
      { key: "linkedin_url", label: "LinkedIn URL" },
      { key: "telegram", label: "Telegram" },
      { key: "other_contact", label: "Other contact" },
      { key: "status_nomi", label: "Status (Nomi)" },
      { key: "status_startech", label: "Status (StarTech)" },
      { key: "status_luminarix", label: "Status (Luminarix)" },
      { key: "notes", label: "Notes" },
    ],
  },
  networks: {
    label: "Networks",
    required: ["name"],
    fields: [
      { key: "name", label: "Name (required, unique)" },
      { key: "tier", label: "Tier (A/B/C)" },
      { key: "login_url", label: "Login URL" },
      { key: "registration_url", label: "Registration URL" },
      { key: "linkedin_url", label: "LinkedIn URL" },
      { key: "notes", label: "Notes" },
    ],
  },
  offers: {
    label: "Offers",
    required: ["name"],
    fields: [
      { key: "name", label: "Name (required)" },
      { key: "network_name", label: "Network name" },
      { key: "vertical", label: "Vertical" },
      { key: "payout", label: "Payout" },
      { key: "traffic_sources", label: "Traffic sources" },
      { key: "preview_link", label: "Preview link" },
      { key: "status", label: "Status" },
      { key: "kpi_notes", label: "KPI notes" },
    ],
  },
  wishlists: {
    label: "Publisher Wishlists",
    required: ["requested_offer"],
    fields: [
      { key: "publisher_name", label: "Publisher name" },
      { key: "requested_offer", label: "Requested offer (required)" },
      { key: "vertical", label: "Vertical" },
      { key: "link_or_network", label: "Link / Network" },
      { key: "notes", label: "Notes" },
    ],
  },
  demand: {
    label: "Network Demand",
    required: ["offer_name"],
    fields: [
      { key: "network_name", label: "Network name" },
      { key: "offer_name", label: "Offer name (required)" },
      { key: "vertical", label: "Vertical" },
      { key: "link", label: "Link" },
      { key: "payout", label: "Payout" },
      { key: "notes", label: "Notes" },
    ],
  },
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function similarity(a: string, b: string): number {
  const x = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const y = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!x || !y) return 0;
  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) return 70;
  const max = Math.max(x.length, y.length);
  let same = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) same++;
  }
  return Math.round((same / max) * 100);
}

function autoMap(
  headers: string[],
  fields: { key: string; label: string }[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    let best: { field: string; score: number } | null = null;
    for (const f of fields) {
      const score = Math.max(
        similarity(h, f.key),
        similarity(h, f.label.replace(/\(.+?\)/g, "").trim()),
      );
      if (score > 50 && (!best || score > best.score)) {
        best = { field: f.key, score };
      }
    }
    if (best) mapping[h] = best.field;
  }
  return mapping;
}

export function ImportWizard() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [table, setTable] = useState<ImportTable>("contacts");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    batchId: string;
  } | null>(null);
  const [undoPending, startUndo] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const tableInfo = TABLE_INFO[table];

  const mappedRows = useMemo(() => {
    if (!file) return [];
    return file.rows.map((row) => {
      const out: Record<string, string | null> = {};
      for (const header of Object.keys(row)) {
        const field = mapping[header];
        if (field) {
          const v = row[header];
          out[field] = v === undefined || v === "" ? null : v;
        }
      }
      return out;
    });
  }, [file, mapping]);

  const validation = useMemo(() => {
    const missing: number[] = [];
    mappedRows.forEach((row, i) => {
      const lacksRequired = tableInfo.required.some(
        (f) => !row[f] || String(row[f]).trim() === "",
      );
      if (lacksRequired) missing.push(i);
    });
    return { missing };
  }, [mappedRows, tableInfo]);

  async function handleFile(f: File) {
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext === "csv") {
      Papa.parse<Record<string, string>>(f, {
        header: true,
        skipEmptyLines: true,
        complete(res) {
          if (!res.meta.fields?.length) {
            toast.error("Could not parse CSV headers");
            return;
          }
          const parsed: ParsedFile = {
            filename: f.name,
            headers: res.meta.fields,
            rows: res.data,
          };
          setFile(parsed);
          setMapping(autoMap(parsed.headers, tableInfo.fields));
          setStep(2);
        },
        error(err) {
          toast.error("CSV parse error: " + err.message);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const arr = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
      if (arr.length === 0) {
        toast.error("Excel file appears empty");
        return;
      }
      const headers = Object.keys(arr[0]);
      const parsed: ParsedFile = { filename: f.name, headers, rows: arr };
      setFile(parsed);
      setMapping(autoMap(parsed.headers, tableInfo.fields));
      setStep(2);
    } else {
      toast.error("Unsupported file type. Use .csv, .xlsx, or .xls.");
    }
  }

  function changeTable(t: ImportTable) {
    setTable(t);
    if (file) setMapping(autoMap(file.headers, TABLE_INFO[t].fields));
  }

  function runImport() {
    if (!file) return;
    if (validation.missing.length === mappedRows.length) {
      toast.error(`All rows missing required field(s): ${tableInfo.required.join(", ")}`);
      return;
    }
    startTransition(async () => {
      const validRows = mappedRows.filter(
        (_, i) => !validation.missing.includes(i),
      );
      const res = await bulkImport(table, validRows);
      if (!res.ok) {
        toast.error("Import failed: " + res.error);
        return;
      }
      setResult({ inserted: res.inserted, skipped: res.skipped, batchId: res.batchId });
      setStep(6);
      toast.success(`Imported ${res.inserted} rows`);
    });
  }

  function undo() {
    if (!result) return;
    if (!confirm(`Delete all ${result.inserted} rows from this import?`)) return;
    startUndo(async () => {
      const r = await undoImport(table, result.batchId);
      if (!r.ok) {
        toast.error("Undo failed: " + r.error);
        return;
      }
      toast.success(`Removed ${r.deleted} rows`);
      reset();
    });
  }

  function reset() {
    setFile(null);
    setMapping({});
    setResult(null);
    setStep(1);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 && (
          <Step1Upload
            onFile={handleFile}
            onChooseTable={changeTable}
            table={table}
            fileRef={fileRef}
          />
        )}
        {step === 2 && file && (
          <Step2Mapping
            file={file}
            tableInfo={tableInfo}
            mapping={mapping}
            onMappingChange={setMapping}
            onChangeTable={changeTable}
            table={table}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && file && (
          <Step3Preview
            file={file}
            mappedRows={mappedRows}
            mapping={mapping}
            tableInfo={tableInfo}
            validation={validation}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && file && (
          <Step4Confirm
            tableInfo={tableInfo}
            total={mappedRows.length}
            valid={mappedRows.length - validation.missing.length}
            skipped={validation.missing.length}
            pending={pending}
            onImport={runImport}
            onBack={() => setStep(3)}
          />
        )}
        {step === 6 && result && (
          <Step6Result
            tableInfo={tableInfo}
            table={table}
            result={result}
            onUndo={undo}
            undoPending={undoPending}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}

// =================== Sub-components ===================

function Stepper({ step }: { step: Step }) {
  const labels = ["Upload", "Map columns", "Preview", "Confirm", "Done"];
  const active = step >= 5 ? 5 : step;
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {labels.map((lbl, i) => {
        const num = i + 1;
        const done = num < active;
        const isActive = num === active || (step === 6 && num === 5);
        return (
          <li key={lbl} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                done && "bg-emerald-100 text-emerald-700",
                isActive && !done && "bg-slate-900 text-white",
                !done && !isActive && "bg-slate-100 text-slate-500",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : num}
            </span>
            <span
              className={cn(
                "uppercase tracking-wider",
                done && "text-emerald-700",
                isActive && !done && "text-slate-900",
                !done && !isActive && "text-slate-400",
              )}
            >
              {lbl}
            </span>
            {num < labels.length && (
              <ChevronRight className="h-3 w-3 text-slate-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Step1Upload({
  onFile,
  onChooseTable,
  table,
  fileRef,
}: {
  onFile: (f: File) => void;
  onChooseTable: (t: ImportTable) => void;
  table: ImportTable;
  fileRef: React.RefObject<HTMLInputElement>;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Target table</Label>
        <Select value={table} onValueChange={(v) => onChooseTable(v as ImportTable)}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TABLE_INFO) as ImportTable[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TABLE_INFO[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
          drag
            ? "border-slate-900 bg-slate-50"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        <Upload className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-900">
          Drop a CSV or Excel file
        </p>
        <p className="mt-1 text-xs text-slate-500">
          .csv, .xlsx, or .xls · first row should contain column headers
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => fileRef.current?.click()}
        >
          <FileText className="h-4 w-4" />
          Choose file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </div>
  );
}

function Step2Mapping({
  file,
  tableInfo,
  mapping,
  onMappingChange,
  onChangeTable,
  table,
  onNext,
  onBack,
}: {
  file: ParsedFile;
  tableInfo: (typeof TABLE_INFO)[ImportTable];
  mapping: Record<string, string>;
  onMappingChange: (m: Record<string, string>) => void;
  onChangeTable: (t: ImportTable) => void;
  table: ImportTable;
  onNext: () => void;
  onBack: () => void;
}) {
  const requiredMissing = tableInfo.required.filter(
    (req) => !Object.values(mapping).includes(req),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{file.filename}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{file.rows.length} rows</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Target</Label>
          <Select value={table} onValueChange={(v) => onChangeTable(v as ImportTable)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TABLE_INFO) as ImportTable[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TABLE_INFO[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Column mapping
        </div>
        <div className="rounded-lg border border-slate-200">
          {file.headers.map((h, idx) => (
            <div
              key={h}
              className={cn(
                "grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_24px_1fr]",
                idx > 0 && "border-t border-slate-100",
              )}
            >
              <div className="text-sm text-slate-700">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {h}
                </code>
                <div className="mt-0.5 truncate text-[11px] text-slate-400">
                  e.g. {String(file.rows[0]?.[h] ?? "—").slice(0, 60)}
                </div>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
              <Select
                value={mapping[h] ?? "__skip__"}
                onValueChange={(v) => {
                  const next = { ...mapping };
                  if (v === "__skip__") delete next[h];
                  else next[h] = v;
                  onMappingChange(next);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Skip column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">
                    <span className="text-slate-400">Skip column</span>
                  </SelectItem>
                  {tableInfo.fields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {requiredMissing.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          Required field{requiredMissing.length === 1 ? "" : "s"} not mapped:{" "}
          <code className="rounded bg-red-100 px-1">
            {requiredMissing.join(", ")}
          </code>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Upload different file
        </Button>
        <Button
          onClick={onNext}
          disabled={requiredMissing.length > 0}
        >
          Preview <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step3Preview({
  file,
  mappedRows,
  mapping,
  tableInfo,
  validation,
  onNext,
  onBack,
}: {
  file: ParsedFile;
  mappedRows: Record<string, string | null>[];
  mapping: Record<string, string>;
  tableInfo: (typeof TABLE_INFO)[ImportTable];
  validation: { missing: number[] };
  onNext: () => void;
  onBack: () => void;
}) {
  const mappedFields = tableInfo.fields.filter((f) =>
    Object.values(mapping).includes(f.key),
  );
  const preview = mappedRows.slice(0, 10);
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">
        Preview of the first 10 mapped rows.{" "}
        {validation.missing.length > 0 && (
          <span className="text-red-600">
            {validation.missing.length} row{validation.missing.length === 1 ? "" : "s"}{" "}
            missing required fields will be skipped.
          </span>
        )}
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500">#</th>
              {mappedFields.map((f) => (
                <th
                  key={f.key}
                  className="px-3 py-2 text-left font-medium text-slate-500"
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => {
              const invalid = validation.missing.includes(i);
              return (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-slate-100",
                    invalid && "bg-red-50",
                  )}
                >
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  {mappedFields.map((f) => (
                    <td key={f.key} className="px-3 py-1.5 text-slate-700">
                      {row[f.key] ?? <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Showing 10 of {file.rows.length} rows.
      </p>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext}>
          Confirm <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step4Confirm({
  tableInfo,
  total,
  valid,
  skipped,
  pending,
  onImport,
  onBack,
}: {
  tableInfo: (typeof TABLE_INFO)[ImportTable];
  total: number;
  valid: number;
  skipped: number;
  pending: boolean;
  onImport: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-700">Ready to import:</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="text-2xl font-semibold text-slate-900">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Total rows</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-2xl font-semibold text-emerald-700">
            {valid.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600">Will insert</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl font-semibold text-red-700">
            {skipped.toLocaleString()}
          </div>
          <div className="text-xs text-red-600">Will skip</div>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Importing into <strong>{tableInfo.label}</strong>. Each row will be tagged
        with an import batch ID so you can undo this on the next screen.
      </p>
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onImport} disabled={pending || valid === 0}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Import {valid.toLocaleString()} rows
        </Button>
      </div>
    </div>
  );
}

function Step6Result({
  tableInfo,
  table,
  result,
  onUndo,
  undoPending,
  onReset,
}: {
  tableInfo: (typeof TABLE_INFO)[ImportTable];
  table: ImportTable;
  result: { inserted: number; skipped: number; batchId: string };
  onUndo: () => void;
  undoPending: boolean;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <div className="text-xl font-semibold text-slate-900">
            Imported {result.inserted.toLocaleString()} rows
          </div>
          <div className="text-sm text-slate-500">
            {result.skipped > 0 && `Skipped ${result.skipped} (missing required fields). `}
            Batch tag: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{result.batchId}</code>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={`/${table}`}>View imported {tableInfo.label}</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Import another file
        </Button>
        <Button
          variant="ghost"
          onClick={onUndo}
          disabled={undoPending}
          className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {undoPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Undo import
        </Button>
      </div>
    </div>
  );
}
