import { api } from "@/api/client";
import type { InventorySummary, ItemImage, ItemStatus, StaffItem } from "@/types";

export interface ItemCreatePayload {
  name: string;
  description?: string;
  category?: string;
  condition?: string;
  location?: string;
  tags?: string[];
  price: number;
  minimum_price?: number;
  internal_note?: string;
}

export interface BulkImportRowError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: StaffItem[];
  errors: BulkImportRowError[];
  created_count: number;
  error_count: number;
}

export interface ItemFilters {
  q?: string;
  status?: ItemStatus;
  category?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
}

export const itemService = {
  list: (saleId: string, filters: ItemFilters = {}) =>
    api
      .get<StaffItem[]>(`/sales/${saleId}/items`, { params: filters })
      .then((r) => r.data),

  summary: (saleId: string) =>
    api.get<InventorySummary>(`/sales/${saleId}/inventory/summary`).then((r) => r.data),

  create: (saleId: string, payload: ItemCreatePayload) =>
    api.post<StaffItem>(`/sales/${saleId}/items`, payload).then((r) => r.data),

  bulkCreate: (saleId: string, items: ItemCreatePayload[]) =>
    api.post<BulkImportResult>(`/sales/${saleId}/items/bulk`, { items }).then((r) => r.data),

  bulkImportCsv: (saleId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<BulkImportResult>(`/sales/${saleId}/items/bulk/csv`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  bulkTemplateUrl: (saleId: string) => `/api/v1/sales/${saleId}/items/bulk/template.csv`,

  get: (itemId: string) => api.get<StaffItem>(`/items/${itemId}`).then((r) => r.data),

  update: (itemId: string, payload: Partial<ItemCreatePayload>) =>
    api.patch<StaffItem>(`/items/${itemId}`, payload).then((r) => r.data),

  updatePrice: (itemId: string, price: number) =>
    api.post<StaffItem>(`/items/${itemId}/price`, { price }).then((r) => r.data),

  updateStatus: (itemId: string, status: ItemStatus) =>
    api.post<StaffItem>(`/items/${itemId}/status`, { status }).then((r) => r.data),

  uploadImage: (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<ItemImage>(`/items/${itemId}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  deleteImage: (itemId: string, imageId: string) => api.delete(`/items/${itemId}/images/${imageId}`),

  history: (itemId: string) => api.get(`/items/${itemId}/history`).then((r) => r.data),

  qrUrl: (itemId: string) => `/api/v1/items/${itemId}/qr.png`,
};
