import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export interface ApiErrorShape {
  error?: { code: string; message: string };
}

export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.response?.status === 0 || err.code === "ERR_NETWORK") {
      return "Unable to connect. Please check your connection and try again.";
    }
  }
  return fallback;
}

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || "";

    if (status === 401 && original && !original._retry && !url.includes("/auth/")) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => queue.push(resolve));
        return api(original);
      }

      isRefreshing = true;
      try {
        await api.post("/auth/refresh");
        queue.forEach((resolve) => resolve());
        queue = [];
        return api(original);
      } catch (refreshErr) {
        queue = [];
        window.dispatchEvent(new CustomEvent("saleday:session-expired"));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
