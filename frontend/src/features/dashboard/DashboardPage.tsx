import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DollarSign, Package, Percent, ShoppingBag, TrendingUp } from "lucide-react";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Basics";
import { dashboardService } from "@/services";
import { saleService } from "@/services/saleService";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

const STAT_CARDS = [
  { key: "revenue", label: "Revenue", icon: DollarSign, format: (v: number) => `$${v.toFixed(0)}`, accent: "bg-garden-light text-garden-dark" },
  { key: "items_sold", label: "Sold", icon: ShoppingBag, format: (v: number) => `${v}`, accent: "bg-tag-light text-tag-dark" },
  { key: "items_remaining", label: "Remaining", icon: Package, format: (v: number) => `${v}`, accent: "bg-sky-light text-sky" },
  { key: "sell_through_pct", label: "Sell-through", icon: Percent, format: (v: number) => `${v}%`, accent: "bg-marigold-light text-marigold-dark" },
] as const;

export function DashboardPage() {
  const { saleId } = useParams<{ saleId: string }>();

  const { data: sale } = useQuery({ queryKey: ["sale", saleId], queryFn: () => saleService.get(saleId!), enabled: !!saleId });
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard", saleId],
    queryFn: () => dashboardService.get(saleId!),
    enabled: !!saleId,
    refetchInterval: 15000,
  });

  if (isLoading || !dashboard) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const goalPct = dashboard.sales_goal ? Math.min(100, (dashboard.revenue / dashboard.sales_goal) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="label mb-1">SaleDay Live</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {sale?.name}
            {sale && <StatusBadge status={sale.status} kind="sale" />}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, format, accent }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <div className={`h-9 w-9 rounded-tag flex items-center justify-center mb-3 ${accent}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-2xl font-bold font-mono">{format(dashboard[key] as number)}</p>
            <p className="text-xs text-ink-faint mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {goalPct !== null && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-tag" /> Sales Goal
            </p>
            <p className="font-mono text-sm text-ink-faint">
              ${dashboard.revenue.toFixed(0)} / ${dashboard.sales_goal?.toFixed(0)}
            </p>
          </div>
          <div className="h-3 rounded-full bg-paper-line overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-marigold to-tag rounded-full"
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="font-semibold mb-1">Average Sale</p>
          <p className="text-3xl font-bold font-mono text-garden-dark">${dashboard.average_sale.toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="font-semibold mb-1">Listed Value Remaining</p>
          <p className="text-3xl font-bold font-mono">${dashboard.total_listed_value.toFixed(0)}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Recent Activity</h2>
        <ActivityFeed entries={dashboard.recent_activity} />
      </div>
    </div>
  );
}
