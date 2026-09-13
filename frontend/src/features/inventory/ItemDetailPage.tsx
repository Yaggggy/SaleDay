import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, DollarSign, History, ImageOff, RotateCcw, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, Spinner } from "@/components/ui/Basics";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/api/client";
import { itemService, type ItemCreatePayload } from "@/services/itemService";
import { transactionService } from "@/services";
import { ItemForm } from "@/features/inventory/ItemForm";
import type { PaymentMethod } from "@/types";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "VENMO", "PAYPAL", "OTHER"];

export function ItemDetailPage() {
  const { saleId, itemId } = useParams<{ saleId: string; itemId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("CASH");

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => itemService.get(itemId!),
    enabled: !!itemId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["item", itemId] });
    qc.invalidateQueries({ queryKey: ["items", saleId] });
  };

  const update = useMutation({
    mutationFn: (p: Partial<ItemCreatePayload>) => itemService.update(itemId!, p),
    onSuccess: () => {
      invalidate();
      setShowEdit(false);
      toast.success("Item updated.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const markSold = useMutation({
    mutationFn: () => transactionService.markSold(itemId!, parseFloat(soldPrice), payment),
    onSuccess: () => {
      invalidate();
      setShowSell(false);
      toast.success("Marked sold! 🎉");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "This item has already been sold by another seller.")),
  });

  const undo = useMutation({
    mutationFn: () => transactionService.undoSale(itemId!),
    onSuccess: () => {
      invalidate();
      toast.success("Sale undone.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const uploadImage = useMutation({
    mutationFn: (file: File) => itemService.uploadImage(itemId!, file),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteImage = useMutation({
    mutationFn: (imageId: string) => itemService.deleteImage(itemId!, imageId),
    onSuccess: invalidate,
  });

  if (isLoading || !item) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const canSell = item.status === "AVAILABLE" || item.status === "RESERVED";

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="aspect-square rounded-card overflow-hidden bg-paper-line mb-3">
            {item.images.length ? (
              <img src={item.images[0].url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-ink-faint">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {item.images.map((img) => (
              <div key={img.id} className="relative group">
                <img src={img.url} className="h-16 w-16 rounded-tag object-cover" />
                <button
                  onClick={() => deleteImage.mutate(img.id)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-tag text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="h-16 w-16 rounded-tag border-2 border-dashed border-paper-line flex items-center justify-center cursor-pointer hover:border-ink/30 text-ink-faint">
              <Camera className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage.mutate(f);
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-xs text-ink-faint font-mono mb-3">Ref {item.item_reference}</p>
          <p className="text-3xl font-bold font-mono text-tag-dark mb-1">${Number(item.current_price).toFixed(2)}</p>
          {item.status === "SOLD" && (
            <p className="text-sm text-garden-dark font-medium mb-3">Sold for ${Number(item.final_sold_price).toFixed(2)}</p>
          )}
          {item.description && <p className="text-sm text-ink-soft mb-4">{item.description}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            {item.category && (
              <div>
                <p className="label">Category</p>
                <p>{item.category}</p>
              </div>
            )}
            {item.condition && (
              <div>
                <p className="label">Condition</p>
                <p>{item.condition}</p>
              </div>
            )}
            {item.location && (
              <div>
                <p className="label">Location</p>
                <p>{item.location}</p>
              </div>
            )}
            {item.minimum_price != null && (
              <div>
                <p className="label">Min. Price (internal)</p>
                <p>${Number(item.minimum_price).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canSell && (
              <Button icon={DollarSign} variant="success" onClick={() => { setSoldPrice(String(item.current_price)); setShowSell(true); }}>
                Mark Sold
              </Button>
            )}
            {item.status === "SOLD" && (
              <Button icon={RotateCcw} variant="secondary" onClick={() => undo.mutate()} loading={undo.isPending}>
                Undo Sale
              </Button>
            )}
            <Button icon={Tag} variant="secondary" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button
              icon={History}
              variant="ghost"
              onClick={() => navigate(`/sales/${saleId}/items/${itemId}/history`)}
            >
              History
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-card border border-dashed border-paper-line flex items-center gap-4">
            <img src={itemService.qrUrl(item.id)} alt="QR code" className="h-20 w-20" />
            <div>
              <p className="text-sm font-semibold mb-1">QR label</p>
              <p className="text-xs text-ink-faint mb-2">Scanning this always shows the current price — no need to reprint on changes.</p>
              <a href={itemService.qrUrl(item.id)} download={`${item.item_reference}.png`} className="text-xs font-semibold text-tag hover:underline">
                Download QR
              </a>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Item">
        <ItemForm
          submitLabel="Save changes"
          initial={{
            name: item.name,
            price: Number(item.current_price),
            description: item.description ?? "",
            category: item.category ?? "",
            condition: item.condition ?? "",
            location: item.location ?? "",
            tags: item.tags,
            minimum_price: item.minimum_price ?? undefined,
            internal_note: item.internal_note ?? "",
          }}
          loading={update.isPending}
          onSubmit={(payload) => {
            const { price, ...rest } = payload;
            update.mutate(rest);
            if (price !== Number(item.current_price)) {
              itemService.updatePrice(item.id, price).then(invalidate);
            }
          }}
        />
      </Modal>

      <Modal open={showSell} onClose={() => setShowSell(false)} title="Mark Sold">
        <div className="space-y-4">
          <div>
            <label className="label">Sold for</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint font-mono">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                className="input pl-7"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Payment method</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayment(m)}
                  className={`py-2 rounded-tag text-xs font-semibold border transition-colors ${
                    payment === m ? "bg-ink text-white border-ink" : "border-paper-line text-ink-soft hover:border-ink/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" variant="success" loading={markSold.isPending} onClick={() => markSold.mutate()}>
            Confirm Sale
          </Button>
        </div>
      </Modal>
    </div>
  );
}
