import { useRef, useState } from "react";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Basics";
import { Modal } from "@/components/ui/Modal";
import { apiErrorMessage } from "@/api/client";
import { itemService, type BulkImportResult, type ItemCreatePayload } from "@/services/itemService";

type DraftRow = {
  name: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  tags: string;
  minimum_price: string;
};

const EMPTY_ROW: DraftRow = { name: "", price: "", category: "", condition: "", location: "", tags: "", minimum_price: "" };
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Worn"];

function rowToPayload(row: DraftRow): ItemCreatePayload | null {
  if (!row.name.trim()) return null;
  return {
    name: row.name.trim(),
    price: parseFloat(row.price) || 0,
    category: row.category.trim() || undefined,
    condition: row.condition.trim() || undefined,
    location: row.location.trim() || undefined,
    tags: row.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    minimum_price: row.minimum_price.trim() ? parseFloat(row.minimum_price) : undefined,
  };
}

export function BulkAddModal({
  open,
  onClose,
  saleId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  saleId: string;
  onImported: (result: BulkImportResult) => void;
}) {
  const [tab, setTab] = useState<"rows" | "csv">("rows");
  const [rows, setRows] = useState<DraftRow[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [rowsSubmitting, setRowsSubmitting] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastResult, setLastResult] = useState<BulkImportResult | null>(null);

  function reset() {
    setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
    setCsvFile(null);
    setLastResult(null);
    setTab("rows");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateRow(index: number, field: keyof DraftRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function submitRows() {
    const payloads = rows.map(rowToPayload).filter((r): r is ItemCreatePayload => r !== null);
    if (payloads.length === 0) {
      toast.error("Add at least one item with a name.");
      return;
    }
    setRowsSubmitting(true);
    try {
      const result = await itemService.bulkCreate(saleId, payloads);
      setLastResult(result);
      if (result.created_count > 0) {
        onImported(result);
        toast.success(`Added ${result.created_count} item${result.created_count === 1 ? "" : "s"}.`);
      }
      if (result.error_count === 0) {
        reset();
        onClose();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRowsSubmitting(false);
    }
  }

  async function submitCsv() {
    if (!csvFile) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setCsvSubmitting(true);
    try {
      const result = await itemService.bulkImportCsv(saleId, csvFile);
      setLastResult(result);
      if (result.created_count > 0) {
        onImported(result);
        toast.success(`Imported ${result.created_count} item${result.created_count === 1 ? "" : "s"}.`);
      }
      if (result.error_count === 0) {
        reset();
        onClose();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCsvSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Bulk Add Items"
      width="max-w-3xl"
    >
      <div className="flex gap-1.5 mb-5">
        <button
          onClick={() => setTab("rows")}
          className={`px-3 py-1.5 rounded-tag text-xs font-semibold transition-colors ${
            tab === "rows" ? "bg-ink text-white" : "bg-white border border-paper-line text-ink-soft hover:border-ink/30"
          }`}
        >
          Quick Rows
        </button>
        <button
          onClick={() => setTab("csv")}
          className={`px-3 py-1.5 rounded-tag text-xs font-semibold transition-colors ${
            tab === "csv" ? "bg-ink text-white" : "bg-white border border-paper-line text-ink-soft hover:border-ink/30"
          }`}
        >
          Upload CSV
        </button>
      </div>

      {tab === "rows" ? (
        <div>
          <p className="text-xs text-ink-faint mb-3">
            Fill in a row per item. Only <strong>Name</strong> and <strong>Price</strong> are required — blank rows are ignored.
          </p>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-separate border-spacing-y-1.5 min-w-[820px]">
              <thead>
                <tr className="text-left">
                  <th className="label pb-1">Name</th>
                  <th className="label pb-1 w-24">Price</th>
                  <th className="label pb-1 w-32">Category</th>
                  <th className="label pb-1 w-28">Condition</th>
                  <th className="label pb-1 w-32">Location</th>
                  <th className="label pb-1 w-36">Tags</th>
                  <th className="label pb-1 w-24">Min Price</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-1.5">
                      <input className="input py-1.5" placeholder="Vintage Chair" value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
                    </td>
                    <td className="pr-1.5">
                      <input className="input py-1.5" type="number" min={0} step="0.01" placeholder="0.00" value={row.price} onChange={(e) => updateRow(i, "price", e.target.value)} />
                    </td>
                    <td className="pr-1.5">
                      <input className="input py-1.5" placeholder="Furniture" value={row.category} onChange={(e) => updateRow(i, "category", e.target.value)} />
                    </td>
                    <td className="pr-1.5">
                      <select className="input py-1.5" value={row.condition} onChange={(e) => updateRow(i, "condition", e.target.value)}>
                        <option value="">—</option>
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-1.5">
                      <input className="input py-1.5" placeholder="Garage" value={row.location} onChange={(e) => updateRow(i, "location", e.target.value)} />
                    </td>
                    <td className="pr-1.5">
                      <input className="input py-1.5" placeholder="vintage, rare" value={row.tags} onChange={(e) => updateRow(i, "tags", e.target.value)} />
                    </td>
                    <td className="pr-1.5">
                      <input className="input py-1.5" type="number" min={0} step="0.01" placeholder="—" value={row.minimum_price} onChange={(e) => updateRow(i, "minimum_price", e.target.value)} />
                    </td>
                    <td>
                      <button
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="text-ink-faint hover:text-tag p-1.5 disabled:opacity-30"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="ghost" icon={Plus} onClick={addRow} className="mt-2">
            Add row
          </Button>

          <BulkResultSummary result={lastResult} />

          <Button onClick={submitRows} loading={rowsSubmitting} className="w-full mt-4">
            Add {rows.filter((r) => r.name.trim()).length || ""} Item{rows.filter((r) => r.name.trim()).length === 1 ? "" : "s"}
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-ink-faint mb-3">
            Upload a CSV with a header row. <strong>name</strong> and <strong>price</strong> are required; category, condition, location,
            tags (semicolon-separated), minimum_price, description, and internal_note are optional.
          </p>
          <a
            href={itemService.bulkTemplateUrl(saleId)}
            download
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-tag hover:underline mb-4"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </a>

          <label className="card border-dashed border-2 border-paper-line flex flex-col items-center justify-center gap-2 py-10 cursor-pointer hover:border-tag/40 transition-colors">
            <Upload className="h-6 w-6 text-ink-faint" />
            <span className="text-sm font-medium">{csvFile ? csvFile.name : "Choose a CSV file"}</span>
            <span className="text-xs text-ink-faint">or drag and drop</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <BulkResultSummary result={lastResult} />

          <Button onClick={submitCsv} loading={csvSubmitting} disabled={!csvFile} className="w-full mt-4">
            Import CSV
          </Button>
        </div>
      )}
    </Modal>
  );
}

function BulkResultSummary({ result }: { result: BulkImportResult | null }) {
  if (!result) return null;
  return (
    <div className="mt-4 space-y-2">
      {result.created_count > 0 && (
        <p className="text-sm text-garden-dark font-medium">✓ {result.created_count} item{result.created_count === 1 ? "" : "s"} added.</p>
      )}
      {result.errors.length > 0 && (
        <div className="rounded-tag bg-tag-light/40 border border-tag-light px-3 py-2 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-tag-dark mb-1">{result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped:</p>
          <ul className="text-xs text-tag-dark space-y-0.5">
            {result.errors.map((e, i) => (
              <li key={i}>Row {e.row}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
