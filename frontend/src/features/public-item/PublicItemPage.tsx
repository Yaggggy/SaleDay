import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImageOff, Settings2, Tag } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Basics";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { publicService } from "@/services";

export function PublicItemPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["public-item", qrToken],
    queryFn: () => publicService.getItem(qrToken!),
    enabled: !!qrToken,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <span className="h-14 w-14 rounded-full bg-tag-light flex items-center justify-center mb-4">
          <Tag className="h-7 w-7 text-tag-dark" />
        </span>
        <h1 className="text-xl font-bold mb-1">Item not found</h1>
        <p className="text-ink-faint text-sm">This QR code doesn't match any active item.</p>
      </div>
    );
  }

  const primaryImage = item.images.find((i) => i.is_primary) ?? item.images[0];

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="h-7 w-7 rounded-lg bg-tag flex items-center justify-center rotate-[-8deg]">
            <Tag className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-display font-bold text-sm text-ink-soft">{item.sale_name}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          <div className="aspect-square bg-paper-line relative">
            {primaryImage ? (
              <img src={primaryImage.url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-ink-faint">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
            {item.status === "SOLD" && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/10">
                <span className="animate-sold-stamp border-4 border-tag text-tag font-display font-extrabold text-3xl px-5 py-2 rotate-[-14deg] rounded-lg bg-white/90">
                  SOLD
                </span>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold leading-tight">{item.name}</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-4xl font-extrabold font-mono text-tag-dark mb-4">${item.price.toFixed(2)}</p>

            {item.description && <p className="text-ink-soft mb-4 leading-relaxed">{item.description}</p>}

            <div className="flex gap-2 flex-wrap">
              {item.category && <span className="price-tag text-[11px] bg-sky-light text-sky">{item.category}</span>}
              {item.condition && <span className="price-tag text-[11px] bg-marigold-light text-marigold-dark">{item.condition}</span>}
            </div>
          </div>
        </motion.div>

        {item.is_staff && item.item_id && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate(`/sales/${item.sale_id}/items/${item.item_id}`)}
            className="btn-primary w-full mt-4"
          >
            <Settings2 className="h-4 w-4" /> Manage this item
          </motion.button>
        )}

        <p className="text-center text-xs text-ink-faint mt-8">Powered by SaleDay</p>
      </div>
    </div>
  );
}
