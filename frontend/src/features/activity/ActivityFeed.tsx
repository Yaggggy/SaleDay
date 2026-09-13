import { motion } from "framer-motion";
import { Activity as ActivityIcon, DollarSign, PackagePlus, Tag as TagIcon, UserPlus } from "lucide-react";
import type { ActivityLogEntry } from "@/types";

function describeActivity(entry: ActivityLogEntry): { text: string; icon: typeof ActivityIcon } {
  const actor = entry.actor_name || "Someone";
  const name = (entry.new_value?.name as string) || (entry.log_metadata?.member_name as string) || "";

  switch (entry.action) {
    case "item.created":
      return { text: `${actor} added "${name}"`, icon: PackagePlus };
    case "item.sold": {
      const price = entry.new_value?.sold_price;
      return { text: `${actor} sold an item for $${price}`, icon: DollarSign };
    }
    case "item.sale_undone":
      return { text: `${actor} undid a sale`, icon: DollarSign };
    case "item.price_changed": {
      const from = entry.previous_value?.price;
      const to = entry.new_value?.price;
      return { text: `${actor} changed price $${from} → $${to}`, icon: TagIcon };
    }
    case "item.status_changed":
      return { text: `${actor} moved an item to ${entry.new_value?.status}`, icon: TagIcon };
    case "item.edited":
      return { text: `${actor} edited an item`, icon: TagIcon };
    case "sale.created":
      return { text: `${actor} created the sale`, icon: ActivityIcon };
    case "sale.status_changed":
      return { text: `${actor} moved the sale to ${entry.new_value?.status}`, icon: ActivityIcon };
    case "invitation.sent":
      return { text: `${actor} invited ${entry.new_value?.email}`, icon: UserPlus };
    case "invitation.accepted":
      return { text: `${actor} joined the team`, icon: UserPlus };
    case "member.role_changed":
      return {
        text: `${actor} changed ${entry.log_metadata?.member_name ?? "a member"} to ${entry.new_value?.role}`,
        icon: UserPlus,
      };
    case "member.removed":
      return { text: `${actor} removed a team member`, icon: UserPlus };
    default:
      return { text: `${actor} · ${entry.action}`, icon: ActivityIcon };
  }
}

export function ActivityFeed({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-faint py-6 text-center card">Nothing has happened yet — activity will show up here.</p>;
  }

  return (
    <div className="card divide-y divide-paper-line">
      {entries.map((entry, i) => {
        const { text, icon: Icon } = describeActivity(entry);
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="h-8 w-8 rounded-full bg-paper-line flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-ink-soft" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{text}</p>
            </div>
            <time className="text-xs text-ink-faint shrink-0">
              {new Date(entry.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </time>
          </motion.div>
        );
      })}
    </div>
  );
}
