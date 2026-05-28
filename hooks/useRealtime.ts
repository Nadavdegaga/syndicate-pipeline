"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type Table = "contacts" | "publisher_wishlists" | "activity_log";

type Options = {
  /** Channel ID — should be page-scoped so we don't bleed subscriptions */
  channel: string;
  tables?: Table[];
  /** If provided, only fire for changes touching this entity_id. */
  entityId?: string;
  /** Don't trigger a router.refresh() when this user_id originated the change. */
  ignoreUserId?: string;
  /** When true, show a toast on incoming change. Defaults true. */
  toastOnRemoteChange?: boolean;
};

/**
 * Subscribe to Supabase Realtime for the given tables. On any change, the
 * page is refreshed (server components re-fetch) and a toast is shown.
 *
 * RLS rules apply: anon/authenticated user only sees changes they're allowed to read.
 */
export function useRealtime({
  channel,
  tables = ["contacts", "publisher_wishlists", "activity_log"],
  entityId,
  toastOnRemoteChange = true,
}: Options) {
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(channel);

    for (const table of tables) {
      ch.on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table,
          ...(entityId && table === "activity_log"
            ? { filter: `entity_id=eq.${entityId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Best-effort name extraction for the toast
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newRow = payload.new as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldRow = payload.old as any;
          const name =
            newRow?.name ??
            newRow?.publisher_name ??
            newRow?.offer_name ??
            oldRow?.name ??
            "a record";
          if (toastOnRemoteChange) {
            const verb = payload.eventType.toLowerCase();
            toast.message(`${name} ${verb}d`, {
              description: `Live update from ${table}`,
              duration: 2500,
            });
          }
          router.refresh();
        },
      );
    }

    ch.subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, entityId]);
}
