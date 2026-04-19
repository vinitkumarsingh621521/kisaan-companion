import { Skeleton } from "@/components/ui/skeleton";

export default function RouteSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
