"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Plus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  EMPTY_FILTER,
  encodeFilter,
  decodeFilter,
  OPERATORS_BY_TYPE,
  type Condition,
  type FieldConfig,
  type FilterSpec,
  type Operator,
} from "@/lib/utils/filter";
import { createSavedView } from "@/lib/actions/saved-views";
import type { EntityType } from "@/lib/saved-views/defaults";

export function FilterBuilder({
  fields,
  entity,
}: {
  fields: FieldConfig[];
  entity: EntityType;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = decodeFilter(params.get("f"));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterSpec>(current);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [savePending, startSave] = useTransition();

  const activeCount = current.conditions.length;

  function pushToUrl(spec: FilterSpec) {
    const next = new URLSearchParams(params.toString());
    const enc = encodeFilter(spec);
    if (enc) next.set("f", enc);
    else next.delete("f");
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function addCondition() {
    setDraft({
      ...draft,
      conditions: [
        ...draft.conditions,
        { field: fields[0].key, op: defaultOp(fields[0]), value: "" },
      ],
    });
  }

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setDraft({
      ...draft,
      conditions: draft.conditions.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    });
  }

  function removeCondition(idx: number) {
    setDraft({
      ...draft,
      conditions: draft.conditions.filter((_, i) => i !== idx),
    });
  }

  function apply() {
    pushToUrl(draft);
    setOpen(false);
  }

  function clear() {
    setDraft(EMPTY_FILTER);
    pushToUrl(EMPTY_FILTER);
    setOpen(false);
  }

  function saveAs() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startSave(async () => {
      const r = await createSavedView({
        name,
        entity_type: entity,
        filters: draft,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Saved view "${r.view.name}"`);
      setSaveOpen(false);
      setName("");
      router.refresh();
    });
  }

  function defaultOp(field: FieldConfig): Operator {
    return OPERATORS_BY_TYPE[field.type][0].op;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-1.5 py-0 text-[10px] font-medium tabular-nums text-white">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[640px] max-w-[95vw] p-0"
          align="end"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Filter</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">Combine</Label>
                <Select
                  value={draft.combinator}
                  onValueChange={(v) =>
                    setDraft({ ...draft, combinator: v as "and" | "or" })
                  }
                >
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
            {draft.conditions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                No conditions yet. Add one to start filtering.
              </div>
            ) : (
              <div className="space-y-2">
                {draft.conditions.map((cond, idx) => (
                  <ConditionRow
                    key={idx}
                    cond={cond}
                    fields={fields}
                    onChange={(patch) => updateCondition(idx, patch)}
                    onRemove={() => removeCondition(idx)}
                  />
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full gap-1 border border-dashed border-slate-300"
              onClick={addCondition}
            >
              <Plus className="h-4 w-4" /> Add condition
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear all
              </Button>
              {draft.conditions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveOpen(true)}
                  className="gap-1"
                >
                  <Save className="h-3.5 w-3.5" /> Save as view
                </Button>
              )}
            </div>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current filter as view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="view-name">View name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My open A-tier follow-ups"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveAs();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAs} disabled={savePending}>
              {savePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConditionRow({
  cond,
  fields,
  onChange,
  onRemove,
}: {
  cond: Condition;
  fields: FieldConfig[];
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
}) {
  const fieldConfig = fields.find((f) => f.key === cond.field) ?? fields[0];
  const operators = OPERATORS_BY_TYPE[fieldConfig.type];
  const needsValue = cond.op !== "is_empty" && cond.op !== "is_not_empty";

  return (
    <div className="flex items-start gap-2">
      <Select
        value={cond.field}
        onValueChange={(v) => {
          const next = fields.find((f) => f.key === v);
          if (!next) return;
          onChange({
            field: v,
            // reset op if not valid for the new type
            op: OPERATORS_BY_TYPE[next.type][0].op,
            value: "",
          });
        }}
      >
        <SelectTrigger className="h-9 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={cond.op}
        onValueChange={(v) => onChange({ op: v as Operator })}
      >
        <SelectTrigger className="h-9 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((o) => (
            <SelectItem key={o.op} value={o.op}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && (
        <>
          {fieldConfig.type === "enum" ? (
            <Select
              value={cond.value ?? ""}
              onValueChange={(v) => onChange({ value: v })}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder="Value" />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={
                fieldConfig.type === "date" && cond.op !== "within_days"
                  ? "date"
                  : "text"
              }
              value={cond.value ?? ""}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={
                cond.op === "within_days" ? "e.g. 14" : "Value"
              }
              className="h-9 flex-1 text-xs"
            />
          )}
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
