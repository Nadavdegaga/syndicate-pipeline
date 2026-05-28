import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  meta?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  meta,
  icon: Icon,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-slate-400" />}
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
        </div>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
        {meta && <p className="text-xs text-slate-400">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
