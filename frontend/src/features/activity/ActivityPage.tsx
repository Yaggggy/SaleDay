import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Basics";
import { dashboardService } from "@/services";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

export function ActivityPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["activity", saleId],
    queryFn: () => dashboardService.activity(saleId!, 100),
    enabled: !!saleId,
    refetchInterval: 10000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity Log</h1>
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <ActivityFeed entries={data ?? []} />
      )}
    </div>
  );
}
