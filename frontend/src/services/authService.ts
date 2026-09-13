import { api } from "@/api/client";
import type { AuthMe, User } from "@/types";

export const authService = {
  register: (data: { full_name: string; email: string; password: string; organization_name: string }) =>
    api.post<AuthMe>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthMe>("/auth/login", data).then((r) => r.data),

  logout: () => api.post("/auth/logout"),

  me: () => api.get<AuthMe>("/auth/me").then((r) => r.data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<User>("/auth/change-password", data).then((r) => r.data),
};
