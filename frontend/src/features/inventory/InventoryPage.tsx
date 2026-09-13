import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Printer, Search, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, EmptyState, Spinner } from "@/components/ui/Basics";
import { Modal } from "@/components/ui/Modal";
import { apiErrorMessage } from "@/api/client";
import { itemService, type ItemCreatePayload } from "@/services/itemService";
import { ItemCard } from "@/features/inventory/ItemCard";
import { ItemForm } from "@/features/inventory/ItemForm";
import { BulkAddModal } from "@/features/inventory/BulkAddModal";
import type { ItemStatus } from "@/types";

const STATUS_FILTERS: { value: ItemStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Sold" },
  { value: "UNSOLD", label: "Unsold" },
  { value: "REMOVED", label: "Removed" },
];

export function InventoryPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ItemStatus | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["items", saleId, q, status],
    queryFn: () => itemService.list(saleId!, { q: q || undefined, status: status || undefined }),
    enabled: !!saleId,
  });

  const create = useMutation({
    mutationFn: (payload: ItemCreatePayload) => itemService.create(saleId!, payload),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["items", saleId] });
      setShowAdd(false);
      toast.success(`"${item.name}" added — ready to print a label!`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Printer} onClick={() => navigate(`/sales/${saleId}/labels`)}>
            Print Labels
          </Button>
          <Button variant="secondary" icon={Upload} onClick={() => setShowBulkAdd(true)}>
            Bulk Add
          </Button>
          <Button icon={Plus} onClick={() => setShowAdd(true)}>
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
          <input
            className="input pl-9"
            placeholder="Search by name, category, location, or reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-tag text-xs font-semibold whitespace-nowrap transition-colors ${
                status === f.value ? "bg-ink text-white" : "bg-white border border-paper-line text-ink-soft hover:border-ink/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items found"
          description="Add your first item to start generating QR labels."
          action={
            <Button icon={Plus} onClick={() => setShowAdd(true)}>
              Add Item
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} onClick={() => navigate(`/sales/${saleId}/items/${item.id}`)} />
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Item">
        <ItemForm onSubmit={(payload) => create.mutate(payload)} loading={create.isPending} />
      </Modal>

      <BulkAddModal
        open={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        saleId={saleId!}
        onImported={() => qc.invalidateQueries({ queryKey: ["items", saleId] })}
      />
    </div>
  );
}
