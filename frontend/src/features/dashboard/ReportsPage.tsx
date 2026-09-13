import { useQuery } from "@tanstack/react-query";
import { Download, Trophy } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button, Spinner } from "@/components/ui/Basics";
import { dashboardService, reportService } from "@/services";

export function ReportsPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data: performance, isLoading } = useQuery({
    queryKey: ["team-performance", saleId],
    queryFn: () => dashboardService.teamPerformance(saleId!),
    enabled: !!saleId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-marigold-dark" /> Team Performance
        </h2>
        {isLoading ? (
          <Spinner className="h-6 w-6" />
        ) : !performance || performance.length === 0 ? (
          <p className="text-sm text-ink-faint">No sales recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {performance.map((p, i) => (
              <div key={p.user_id} className="flex items-center justify-between py-2 border-b border-paper-line last:border-0">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-paper-line flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="font-medium">{p.full_name}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-garden-dark">${p.revenue.toFixed(0)}</p>
                  <p className="text-xs text-ink-faint">{p.items_sold} items</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Export Data</h2>
        <div className="flex flex-wrap gap-3">
          <a href={reportService.inventoryCsvUrl(saleId!)}>
            <Button variant="secondary" icon={Download}>Inventory CSV</Button>
          </a>
          <a href={reportService.transactionsCsvUrl(saleId!)}>
            <Button variant="secondary" icon={Download}>Transactions CSV</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
