import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, MapPin, Plus, Sparkles, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, EmptyState, Spinner } from "@/components/ui/Basics";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { saleService, type SaleCreatePayload } from "@/services/saleService";

export function SalesListPage() {
  const { activeOrgId, organizations } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales", activeOrgId],
    queryFn: () => saleService.list(activeOrgId as string),
    enabled: !!activeOrgId,
  });

  const create = useMutation({
    mutationFn: (payload: SaleCreatePayload) => saleService.create(activeOrgId as string, payload),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["sales", activeOrgId] });
      setShowCreate(false);
      toast.success("Sale created — let's add some inventory!");
      navigate(`/sales/${sale.id}/inventory`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const orgName = organizations.find((o) => o.organization_id === activeOrgId)?.organization_name;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="label mb-1">{orgName}</p>
          <h1 className="text-2xl font-bold">Your Sales</h1>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>
          New Sale
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !sales || sales.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No sales yet"
          description="Create your first sale, add inventory, and generate QR labels shoppers can scan."
          action={
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              Create your first sale
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sales.map((sale, i) => (
            <motion.button
              key={sale.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/sales/${sale.id}/dashboard`)}
              className="card p-5 text-left hover:shadow-cardHover hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-semibold text-lg leading-tight pr-2">{sale.name}</h3>
                <StatusBadge status={sale.status} kind="sale" />
              </div>
              <div className="space-y-1.5 text-sm text-ink-faint mb-4">
                {sale.sale_date && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(sale.sale_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {sale.address && (
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {sale.address}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-paper-line text-sm">
                <div>
                  <p className="font-mono font-semibold text-garden-dark">${sale.revenue.toFixed(0)}</p>
                  <p className="text-xs text-ink-faint">Revenue</p>
                </div>
                <div>
                  <p className="font-mono font-semibold">{sale.sold_count}/{sale.item_count}</p>
                  <p className="text-xs text-ink-faint">Sold</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a new sale">
        <CreateSaleForm onSubmit={(payload) => create.mutate(payload)} loading={create.isPending} />
      </Modal>
    </div>
  );
}

function CreateSaleForm({ onSubmit, loading }: { onSubmit: (p: SaleCreatePayload) => void; loading: boolean }) {
  const [form, setForm] = useState<SaleCreatePayload>({ name: "", address: "", sale_date: "", start_time: "", end_time: "" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload: SaleCreatePayload = { ...form };
        if (!payload.address) delete payload.address;
        if (!payload.sale_date) delete payload.sale_date;
        if (!payload.start_time) delete payload.start_time;
        if (!payload.end_time) delete payload.end_time;
        onSubmit(payload);
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">Sale name</label>
        <input required className="input mt-1.5" placeholder="Singh Family Yard Sale" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Address (optional)</label>
        <input className="input mt-1.5" placeholder="123 Maple St." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="label">Date</label>
          <input type="date" className="input mt-1.5" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Start</label>
          <input type="time" className="input mt-1.5" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        </div>
        <div>
          <label className="label">End</label>
          <input type="time" className="input mt-1.5" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </div>
      </div>
      <Button type="submit" loading={loading} icon={Sparkles} className="w-full">
        Create sale
      </Button>
    </form>
  );
}
