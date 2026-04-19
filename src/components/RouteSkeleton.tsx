import { Skeleton } from "@/components/ui/skeleton";
import { Sprout } from "lucide-react";

export default function RouteSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
            <Sprout className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">KrishiMitra</p>
            <p className="text-xs text-muted-foreground">Loading…</p>
          </div>
        </div>
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
