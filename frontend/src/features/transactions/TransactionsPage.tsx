import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState, Spinner } from "@/components/ui/Basics";
import { transactionService } from "@/services";

export function TransactionsPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["transactions", saleId],
    queryFn: () => transactionService.list(saleId!),
    enabled: !!saleId,
    refetchInterval: 15000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sales</h1>
      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Receipt} title="No sales yet" description="Completed sales will show up here in real time." />
      ) : (
        <div className="card divide-y divide-paper-line">
          {data.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{t.item_name}</p>
                <p className="text-xs text-ink-faint">
                  {t.sold_by_name} · {t.payment_method} {t.status === "REVERSED" && <span className="text-tag">· Reversed</span>}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-mono font-bold text-garden-dark">${Number(t.sold_price).toFixed(2)}</p>
                <p className="text-xs text-ink-faint">
                  {new Date(t.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
