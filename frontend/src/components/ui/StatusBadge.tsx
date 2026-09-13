import { motion } from "framer-motion";
import type { ItemStatus, SaleStatus } from "@/types";

const ITEM_LABELS: Record<ItemStatus, string> = {
  DRAFT: "Draft",
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  REMOVED: "Removed",
  UNSOLD: "Unsold",
};

const SALE_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Draft",
  PREPARING: "Preparing",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const CLASS_MAP: Record<string, string> = {
  DRAFT: "status-draft",
  AVAILABLE: "status-available",
  RESERVED: "status-reserved",
  SOLD: "status-sold",
  REMOVED: "status-removed",
  UNSOLD: "status-unsold",
  PREPARING: "status-reserved",
  ACTIVE: "status-available",
  COMPLETED: "status-sold",
  ARCHIVED: "status-removed",
};

export function StatusBadge({ status, kind = "item" }: { status: ItemStatus | SaleStatus; kind?: "item" | "sale" }) {
  const label = kind === "item" ? ITEM_LABELS[status as ItemStatus] : SALE_LABELS[status as SaleStatus];
  return (
    <motion.span
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={`price-tag text-[11px] ${CLASS_MAP[status] ?? "status-draft"}`}
    >
      {label}
    </motion.span>
  );
}
