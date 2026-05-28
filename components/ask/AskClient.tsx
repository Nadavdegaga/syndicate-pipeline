"use client";

import { useState, useTransition } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useBrand } from "@/hooks/useBrand";
import { BRAND_LABELS } from "@/types";
import { relativeOrDash } from "@/lib/utils/dates";

const SUGGESTIONS = [
  "How many leads are stuck in Pending for over 14 days?",
  "Which networks gave me the most offers this month?",
  "Who haven't I talked to in 3+ weeks?",
  "What's my conversion rate from Pending to Approved?",
  "Show me the top 5 publishers by wishlist requests",
  "Which verticals have the highest demand right now?",
];

type HistoryEntry = {
  id: string;
  question: string;
  answer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_calls: { name: string; input: any; result: any }[];
  input_tokens: number;
  output_tokens: number;
  brand_context: string | null;
  created_at: string;
};

export function AskClient({
  initialHistory,
}: {
  initialHistory: HistoryEntry[];
}) {
  const { brand } = useBrand();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [pending, startPending] = useTransition();

  async function submit(q: string) {
    if (!q.trim()) return;
    setQuestion("");
    const optimisticId = "pending-" + Date.now();
    const pendingEntry: HistoryEntry = {
      id: optimisticId,
      question: q,
      answer: "",
      tool_calls: [],
      input_tokens: 0,
      output_tokens: 0,
      brand_context: brand === "all" ? null : brand,
      created_at: new Date().toISOString(),
    };
    setHistory((h) => [pendingEntry, ...h]);

    startPending(async () => {
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, brand }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          toast.error(err.error ?? `Request failed (${r.status})`);
          setHistory((h) => h.filter((x) => x.id !== optimisticId));
          return;
        }
        const data = await r.json();
        setHistory((h) =>
          h.map((x) =>
            x.id === optimisticId
              ? {
                  ...x,
                  id: optimisticId,
                  answer: data.answer,
                  tool_calls: data.tool_calls,
                  input_tokens: data.input_tokens,
                  output_tokens: data.output_tokens,
                }
              : x,
          ),
        );
      } catch (e) {
        toast.error("Network error: " + (e instanceof Error ? e.message : e));
        setHistory((h) => h.filter((x) => x.id !== optimisticId));
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(question);
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span>
              Ask anything about your data — scope:{" "}
              <span className="font-medium">{BRAND_LABELS[brand]}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit(question);
                }
              }}
              placeholder="How many contacts are pending for over 14 days?"
              rows={2}
              className="resize-none"
              disabled={pending}
            />
            <Button
              type="submit"
              disabled={pending || !question.trim()}
              className="self-start"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400">⌘+Enter to submit</p>
        </form>

        <Separator className="my-5" />

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Suggested questions
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                disabled={pending}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            History
          </div>
          {history.map((h) => (
            <AnswerCard key={h.id} entry={h} loading={h.id.startsWith("pending-") && pending} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerCard({
  entry,
  loading,
}: {
  entry: HistoryEntry;
  loading: boolean;
}) {
  const [showTools, setShowTools] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-400">
            {relativeOrDash(entry.created_at)}
            {entry.brand_context && (
              <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                {entry.brand_context}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-slate-900">
            {entry.question}
          </div>
        </div>
        {!loading && (
          <div className="shrink-0 text-xs text-slate-400">
            {entry.input_tokens + entry.output_tokens} tokens
          </div>
        )}
      </div>
      <div className="mt-3 border-l-2 border-violet-200 pl-4 text-sm text-slate-800">
        {loading ? (
          <div className="inline-flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{entry.answer}</div>
        )}
      </div>
      {entry.tool_calls.length > 0 && (
        <button
          type="button"
          onClick={() => setShowTools((s) => !s)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          {showTools ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Database className="h-3 w-3" />
          {entry.tool_calls.length} query{entry.tool_calls.length === 1 ? "" : "s"}{" "}
          run
        </button>
      )}
      {showTools && (
        <div className="mt-3 space-y-2">
          {entry.tool_calls.map((t, i) => (
            <details
              key={i}
              className="rounded-md bg-slate-50 px-3 py-2 text-xs"
            >
              <summary className="cursor-pointer font-medium text-slate-700">
                {t.name}
                <span className="ml-2 font-mono text-slate-500">
                  {JSON.stringify(t.input)}
                </span>
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">
                {JSON.stringify(t.result, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
