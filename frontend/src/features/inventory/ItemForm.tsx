import { useState } from "react";
import { Button } from "@/components/ui/Basics";
import type { ItemCreatePayload } from "@/services/itemService";

const DEFAULT_CATEGORIES = [
  "Furniture", "Electronics", "Clothing", "Books", "Toys",
  "Kitchen", "Tools", "Sports", "Home Decor", "Collectibles", "Other",
];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Worn"];

export function ItemForm({
  initial,
  onSubmit,
  loading,
  submitLabel = "Add item",
}: {
  initial?: Partial<ItemCreatePayload>;
  onSubmit: (payload: ItemCreatePayload) => void;
  loading: boolean;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<ItemCreatePayload>({
    name: initial?.name ?? "",
    price: initial?.price ?? 0,
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    condition: initial?.condition ?? "",
    location: initial?.location ?? "",
    minimum_price: initial?.minimum_price,
    internal_note: initial?.internal_note ?? "",
  });
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
        onSubmit({ ...form, tags });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">Item name</label>
        <input required autoFocus className="input mt-1.5" placeholder="Vintage Wooden Chair" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Price</label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint font-mono">$</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className="input pl-7"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div>
          <label className="label">Condition</label>
          <select className="input mt-1.5" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="">Select…</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input mt-1.5" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select…</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input mt-1.5" placeholder="Garage — Table 2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea
          className="input mt-1.5 min-h-[70px]"
          placeholder="Solid wooden dining chair, minor scratches."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Tags (comma separated, optional)</label>
        <input className="input mt-1.5" placeholder="vintage, working, rare" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-faint font-medium select-none">Internal-only details (staff only, never public)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label">Minimum acceptable price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input mt-1.5"
              value={form.minimum_price ?? ""}
              onChange={(e) => setForm({ ...form, minimum_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="label">Internal note</label>
            <textarea className="input mt-1.5" value={form.internal_note} onChange={(e) => setForm({ ...form, internal_note: e.target.value })} />
          </div>
        </div>
      </details>

      <Button type="submit" loading={loading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
