import { cn } from "@/lib/utils";
import { getStatusStyle } from "@/lib/utils/status";

type StatusBadgeProps = {
  value: string | null | undefined;
  size?: "sm" | "md";
  truncate?: boolean;
  className?: string;
};

export function StatusBadge({
  value,
  size = "sm",
  truncate = true,
  className,
}: StatusBadgeProps) {
  if (!value) {
    return <span className="text-slate-300">—</span>;
  }
  const style = getStatusStyle(value);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        truncate ? "max-w-[200px] truncate" : "",
        style.bg,
        style.text,
        style.ring,
        className,
      )}
      title={value}
    >
      {value}
    </span>
  );
}
