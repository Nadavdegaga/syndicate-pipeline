import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton } from "@/components/shared/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}
