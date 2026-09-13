import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "@/services/authService";
import type { AuthMe, OrganizationMembership, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  organizations: OrganizationMembership[];
  activeOrgId: string | null;
  setActiveOrgId: (id: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; organization_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVE_ORG_KEY = "saleday.activeOrgId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORG_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((data: AuthMe) => {
    setUser(data.user);
    setOrganizations(data.organizations);
    setActiveOrgIdState((prev) => {
      const stillValid = prev && data.organizations.some((o) => o.organization_id === prev);
      const next = stillValid ? prev : data.organizations[0]?.organization_id ?? null;
      if (next) localStorage.setItem(ACTIVE_ORG_KEY, next);
      return next;
    });
  }, []);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authService.me();
      applyAuth(data);
    } catch {
      setUser(null);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuth]);

  useEffect(() => {
    bootstrap();
    const onExpired = () => {
      setUser(null);
      setOrganizations([]);
    };
    window.addEventListener("saleday:session-expired", onExpired);
    return () => window.removeEventListener("saleday:session-expired", onExpired);
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    applyAuth(data);
  }, [applyAuth]);

  const register = useCallback(
    async (data: { full_name: string; email: string; password: string; organization_name: string }) => {
      const res = await authService.register(data);
      applyAuth(res);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setOrganizations([]);
  }, []);

  const setActiveOrgId = useCallback((id: string) => {
    setActiveOrgIdState(id);
    localStorage.setItem(ACTIVE_ORG_KEY, id);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organizations,
      activeOrgId,
      setActiveOrgId,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refresh: bootstrap,
    }),
    [user, organizations, activeOrgId, setActiveOrgId, isLoading, login, register, logout, bootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
