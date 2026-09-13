export type OrgRole = "OWNER" | "ADMIN" | "SELLER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "REMOVED";
export type SaleStatus = "DRAFT" | "PREPARING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ItemStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "UNSOLD";
export type PaymentMethod = "CASH" | "CARD" | "VENMO" | "PAYPAL" | "OTHER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface User {
  id: string;
  full_name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface OrganizationMembership {
  organization_id: string;
  organization_name: string;
  role: OrgRole;
  status: MemberStatus;
}

export interface AuthMe {
  user: User;
  organizations: OrganizationMembership[];
}

export interface Sale {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  address: string | null;
  sale_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: SaleStatus;
  sales_goal: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleSummary extends Sale {
  item_count: number;
  sold_count: number;
  revenue: number;
}

export interface ItemImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface StaffItem {
  id: string;
  sale_id: string;
  name: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  location: string | null;
  tags: string[];
  item_reference: string;
  qr_token: string;
  status: ItemStatus;
  original_listed_price: number;
  current_price: number;
  minimum_price: number | null;
  final_sold_price: number | null;
  internal_note: string | null;
  sold_by_id: string | null;
  sold_at: string | null;
  images: ItemImage[];
  created_at: string;
  updated_at: string;
}

export interface PublicItem {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  condition: string | null;
  status: ItemStatus;
  images: ItemImage[];
  sale_name: string;
  sale_status: string;
  is_staff: boolean;
  item_id: string | null;
  sale_id: string | null;
}

export interface InventorySummary {
  total: number;
  available: number;
  sold: number;
  reserved: number;
  removed: number;
  unsold: number;
}

export interface Transaction {
  id: string;
  sale_id: string;
  item_id: string;
  item_name?: string | null;
  sold_price: number;
  payment_method: PaymentMethod;
  sold_by_id: string;
  sold_by_name?: string | null;
  status: "COMPLETED" | "REVERSED";
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  sale_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  log_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Dashboard {
  revenue: number;
  items_sold: number;
  items_remaining: number;
  sell_through_pct: number;
  average_sale: number;
  sales_goal: number | null;
  total_items: number;
  total_listed_value: number;
  recent_activity: ActivityLogEntry[];
}

export interface TeamPerformanceEntry {
  user_id: string;
  full_name: string;
  items_sold: number;
  revenue: number;
}

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: OrgRole;
  status: MemberStatus;
  joined_at: string;
  last_active_at: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface ApiError {
  error: { code: string; message: string };
}
