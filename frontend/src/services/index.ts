import { api } from "@/api/client";
import type {
  ActivityLogEntry,
  Dashboard,
  Invitation,
  OrgRole,
  PaymentMethod,
  PublicItem,
  StaffItem,
  TeamMember,
  TeamPerformanceEntry,
  Transaction,
} from "@/types";

export const transactionService = {
  markSold: (itemId: string, sold_price: number, payment_method: PaymentMethod) =>
    api.post<StaffItem>(`/items/${itemId}/mark-sold`, { sold_price, payment_method }).then((r) => r.data),

  undoSale: (itemId: string) => api.post<StaffItem>(`/items/${itemId}/undo-sale`).then((r) => r.data),

  list: (saleId: string) => api.get<Transaction[]>(`/sales/${saleId}/transactions`).then((r) => r.data),
};

export const dashboardService = {
  get: (saleId: string) => api.get<Dashboard>(`/sales/${saleId}/dashboard`).then((r) => r.data),
  teamPerformance: (saleId: string) =>
    api.get<TeamPerformanceEntry[]>(`/sales/${saleId}/team-performance`).then((r) => r.data),
  activity: (saleId: string, limit = 50) =>
    api.get<ActivityLogEntry[]>(`/sales/${saleId}/activity`, { params: { limit } }).then((r) => r.data),
};

export const teamService = {
  listMembers: (orgId: string) => api.get<TeamMember[]>(`/organizations/${orgId}/members`).then((r) => r.data),
  updateRole: (orgId: string, memberId: string, role: OrgRole) =>
    api.patch<TeamMember>(`/organizations/${orgId}/members/${memberId}`, { role }).then((r) => r.data),
  removeMember: (orgId: string, memberId: string) => api.delete(`/organizations/${orgId}/members/${memberId}`),
  listInvitations: (orgId: string) => api.get<Invitation[]>(`/organizations/${orgId}/invitations`).then((r) => r.data),
  invite: (orgId: string, email: string, role: OrgRole) =>
    api.post<Invitation>(`/organizations/${orgId}/invitations`, { email, role }).then((r) => r.data),
  revokeInvitation: (orgId: string, invitationId: string) =>
    api.delete(`/organizations/${orgId}/invitations/${invitationId}`),
  resendInvitation: (orgId: string, invitationId: string) =>
    api.post<Invitation>(`/organizations/${orgId}/invitations/${invitationId}/resend`).then((r) => r.data),
  acceptInvitation: (data: { token: string; full_name?: string; password?: string }) =>
    api.post<TeamMember>(`/invitations/accept`, data).then((r) => r.data),
};

export const publicService = {
  getItem: (qrToken: string) => api.get<PublicItem>(`/public/items/${qrToken}`).then((r) => r.data),
};

export const reportService = {
  inventoryCsvUrl: (saleId: string) => `/api/v1/sales/${saleId}/reports/inventory.csv`,
  transactionsCsvUrl: (saleId: string) => `/api/v1/sales/${saleId}/reports/transactions.csv`,
};
