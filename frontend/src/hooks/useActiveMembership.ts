import { useAuth } from "@/hooks/useAuth";
import type { OrgRole } from "@/types";

const ROLE_LEVEL: Record<OrgRole, number> = { VIEWER: 0, SELLER: 1, ADMIN: 2, OWNER: 3 };

export function useActiveMembership() {
  const { organizations, activeOrgId } = useAuth();
  const membership = organizations.find((o) => o.organization_id === activeOrgId) ?? null;
  return membership;
}

export function useHasRole(minRole: OrgRole): boolean {
  const membership = useActiveMembership();
  if (!membership) return false;
  return ROLE_LEVEL[membership.role] >= ROLE_LEVEL[minRole];
}
