import { motion } from "framer-motion";
import { ImageOff, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StaffItem } from "@/types";

export function ItemCard({ item, onClick, index = 0 }: { item: StaffItem; onClick: () => void; index?: number }) {
  const primaryImage = item.images.find((i) => i.is_primary) ?? item.images[0];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      onClick={onClick}
      className="card overflow-hidden text-left relative hover:shadow-cardHover hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-[4/3] bg-paper-line relative">
        {primaryImage ? (
          <img src={primaryImage.url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-ink-faint">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        {item.status === "SOLD" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/10">
            <span className="animate-sold-stamp border-4 border-tag text-tag font-display font-extrabold text-xl px-3 py-1 rotate-[-14deg] rounded-md bg-white/80">
              SOLD
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm leading-snug line-clamp-2">{item.name}</h4>
        </div>
        <p className="font-mono font-bold text-tag-dark">${Number(item.current_price).toFixed(2)}</p>
        <div className="flex items-center justify-between mt-2">
          <StatusBadge status={item.status} />
          {item.location && (
            <span className="text-[11px] text-ink-faint flex items-center gap-0.5 truncate max-w-[90px]">
              <MapPin className="h-3 w-3 shrink-0" /> {item.location}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
