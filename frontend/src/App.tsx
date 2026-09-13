import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { SalesListPage } from "@/features/sales/SalesListPage";
import { SaleSettingsPage } from "@/features/sales/SaleSettingsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ReportsPage } from "@/features/dashboard/ReportsPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { ItemDetailPage } from "@/features/inventory/ItemDetailPage";
import { ItemHistoryPage } from "@/features/inventory/ItemHistoryPage";
import { LabelsPage } from "@/features/inventory/LabelsPage";
import { ScannerPage } from "@/features/scanner/ScannerPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { TeamPage } from "@/features/team/TeamPage";
import { ActivityPage } from "@/features/activity/ActivityPage";
import { PublicItemPage } from "@/features/public-item/PublicItemPage";
import { AcceptInvitePage } from "@/features/team/AcceptInvitePage";
import { NotFoundPage } from "@/features/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-center" toastOptions={{ style: { fontFamily: "Inter, sans-serif", fontSize: "14px" } }} />
          <Routes>
            <Route path="/" element={<Navigate to="/sales" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/i/:qrToken" element={<PublicItemPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/sales" element={<SalesListPage />} />
                <Route path="/sales/:saleId/dashboard" element={<DashboardPage />} />
                <Route path="/sales/:saleId/scan" element={<ScannerPage />} />
                <Route path="/sales/:saleId/inventory" element={<InventoryPage />} />
                <Route path="/sales/:saleId/labels" element={<LabelsPage />} />
                <Route path="/sales/:saleId/items/:itemId" element={<ItemDetailPage />} />
                <Route path="/sales/:saleId/items/:itemId/history" element={<ItemHistoryPage />} />
                <Route path="/sales/:saleId/transactions" element={<TransactionsPage />} />
                <Route path="/sales/:saleId/team" element={<TeamPage />} />
                <Route path="/sales/:saleId/activity" element={<ActivityPage />} />
                <Route path="/sales/:saleId/reports" element={<ReportsPage />} />
                <Route path="/sales/:saleId/settings" element={<SaleSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
