import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, Spinner } from "@/components/ui/Basics";
import { apiErrorMessage } from "@/api/client";
import { useHasRole } from "@/hooks/useActiveMembership";
import { saleService } from "@/services/saleService";
import type { SaleStatus } from "@/types";

const NEXT_STATUS: Record<SaleStatus, SaleStatus[]> = {
  DRAFT: ["PREPARING", "ARCHIVED"],
  PREPARING: ["ACTIVE", "DRAFT", "ARCHIVED"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: ["ARCHIVED", "ACTIVE"],
  ARCHIVED: [],
};

export function SaleSettingsPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const qc = useQueryClient();
  const canEdit = useHasRole("ADMIN");
  const isOwner = useHasRole("OWNER");

  const { data: sale, isLoading } = useQuery({ queryKey: ["sale", saleId], queryFn: () => saleService.get(saleId!), enabled: !!saleId });
  const [form, setForm] = useState<{ name: string; address: string; sales_goal: string; is_public: boolean } | null>(null);

  if (sale && !form) {
    setForm({ name: sale.name, address: sale.address ?? "", sales_goal: sale.sales_goal ? String(sale.sales_goal) : "", is_public: sale.is_public });
  }

  const update = useMutation({
    mutationFn: () =>
      saleService.update(saleId!, {
        name: form!.name,
        address: form!.address || undefined,
        sales_goal: form!.sales_goal ? parseFloat(form!.sales_goal) : undefined,
        is_public: form!.is_public,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale", saleId] });
      toast.success("Sale updated.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const changeStatus = useMutation({
    mutationFn: (status: SaleStatus) => saleService.updateStatus(saleId!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale", saleId] });
      toast.success("Sale status updated.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading || !sale || !form) {
    return <div className="py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Sale Settings</h1>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Sale name</label>
          <input disabled={!canEdit} className="input mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Address</label>
          <input disabled={!canEdit} className="input mt-1.5" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="label">Sales goal</label>
          <input disabled={!canEdit} type="number" className="input mt-1.5" value={form.sales_goal} onChange={(e) => setForm({ ...form, sales_goal: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!canEdit} checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
          Make a public sale page visible (categories only, no private data)
        </label>
        {canEdit && (
          <Button loading={update.isPending} onClick={() => update.mutate()}>
            Save changes
          </Button>
        )}
      </div>

      {isOwner && NEXT_STATUS[sale.status].length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Sale Lifecycle</h2>
          <p className="text-sm text-ink-faint mb-3">Current status: <strong>{sale.status}</strong></p>
          <div className="flex gap-2 flex-wrap">
            {NEXT_STATUS[sale.status].map((s) => (
              <Button key={s} variant="secondary" loading={changeStatus.isPending} onClick={() => changeStatus.mutate(s)}>
                Move to {s}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
