import { api } from "@/api/client";
import type { Sale, SaleStatus, SaleSummary } from "@/types";

export interface SaleCreatePayload {
  name: string;
  description?: string;
  address?: string;
  sale_date?: string;
  start_time?: string;
  end_time?: string;
  sales_goal?: number;
}

export const saleService = {
  list: (orgId: string) => api.get<SaleSummary[]>(`/organizations/${orgId}/sales`).then((r) => r.data),

  create: (orgId: string, payload: SaleCreatePayload) =>
    api.post<Sale>(`/organizations/${orgId}/sales`, payload).then((r) => r.data),

  get: (saleId: string) => api.get<Sale>(`/sales/${saleId}`).then((r) => r.data),

  update: (saleId: string, payload: Partial<SaleCreatePayload> & { is_public?: boolean }) =>
    api.patch<Sale>(`/sales/${saleId}`, payload).then((r) => r.data),

  updateStatus: (saleId: string, status: SaleStatus) =>
    api.post<Sale>(`/sales/${saleId}/status`, { status }).then((r) => r.data),
};
