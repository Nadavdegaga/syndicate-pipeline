"use client";

import { useRealtime } from "@/hooks/useRealtime";

type Table = "contacts" | "publisher_wishlists" | "activity_log";

type Props = {
  channel: string;
  tables?: Table[];
  entityId?: string;
  ignoreUserId?: string;
  toastOnRemoteChange?: boolean;
};

/**
 * Thin server-component-friendly wrapper that mounts a Realtime subscription
 * scoped to one channel. Place at the top of a route to enable live updates.
 */
export function RealtimeBridge(props: Props) {
  useRealtime(props);
  return null;
}
