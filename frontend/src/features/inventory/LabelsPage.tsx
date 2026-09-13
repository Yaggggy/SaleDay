import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Spinner } from "@/components/ui/Basics";
import { itemService } from "@/services/itemService";

export function LabelsPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { data: items, isLoading } = useQuery({
    queryKey: ["items", saleId, "labels"],
    queryFn: () => itemService.list(saleId!, { status: "AVAILABLE" }),
    enabled: !!saleId,
  });

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Button icon={Printer} onClick={() => window.print()}>
          Print all
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-4">
          {(items ?? []).map((item) => (
            <div key={item.id} className="border-2 border-dashed border-ink/20 rounded-card p-4 flex flex-col items-center text-center break-inside-avoid">
              <p className="font-display font-bold text-sm uppercase leading-tight mb-1">{item.name}</p>
              <p className="font-mono font-extrabold text-2xl text-tag-dark mb-2">${Number(item.current_price).toFixed(0)}</p>
              <img src={itemService.qrUrl(item.id)} alt="QR" className="h-28 w-28 mb-2" />
              <p className="text-[10px] text-ink-faint mb-0.5">Scan for Details</p>
              <p className="font-mono text-xs font-semibold">{item.item_reference}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
