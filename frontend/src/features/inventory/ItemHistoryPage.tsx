import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Basics";
import { itemService } from "@/services/itemService";

interface HistoryEntry {
  id: string;
  old_price: number;
  new_price: number;
  changed_by_name: string;
  created_at: string;
}

export function ItemHistoryPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["item-history", itemId],
    queryFn: () => itemService.history(itemId!) as Promise<{ price_history: HistoryEntry[] }>,
    enabled: !!itemId,
  });

  return (
    <div className="max-w-lg">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold mb-5">Price History</h1>
      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>
      ) : !data || data.price_history.length === 0 ? (
        <p className="text-sm text-ink-faint card p-6 text-center">No price changes recorded yet.</p>
      ) : (
        <div className="card divide-y divide-paper-line">
          {data.price_history.map((h) => (
            <div key={h.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold">
                  ${Number(h.old_price).toFixed(2)} → ${Number(h.new_price).toFixed(2)}
                </p>
                <p className="text-xs text-ink-faint">Changed by {h.changed_by_name}</p>
              </div>
              <time className="text-xs text-ink-faint">
                {new Date(h.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
