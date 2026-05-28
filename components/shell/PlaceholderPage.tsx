export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl py-12 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-6 text-xs uppercase tracking-wide text-slate-400">
        Phase 1 placeholder · built in a later phase
      </p>
    </div>
  );
}
