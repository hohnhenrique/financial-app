import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage }       from '@/pages/LoginPage'
import { RegisterPage }    from '@/pages/RegisterPage'
import { DashboardPage }   from '@/pages/DashboardPage'
import { NewTransactionPage } from '@/pages/NewTransactionPage'
import { TransactionsPage }   from '@/pages/TransactionsPage'
import { AccountsPage }    from '@/pages/AccountsPage'
import { CategoriesPage }  from '@/pages/CategoriesPage'
import { ProfilePage }     from '@/pages/ProfilePage'
import { AdminUsersPage }  from '@/pages/AdminUsersPage'
import { GoalsPage }    from '@/pages/GoalsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ImportPage }   from '@/pages/ImportPage'
import { VisibilityProvider } from '@/context/VisibilityContext'
import { ReportsPage } from '@/pages/ReportsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <VisibilityProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="transactions"     element={<TransactionsPage />} />
                  <Route path="transactions/new" element={<NewTransactionPage />} />
                  <Route path="accounts"    element={<AccountsPage />} />
                  <Route path="categories"  element={<CategoriesPage />} />
                  <Route path="profile"     element={<ProfilePage />} />
                  <Route path="admin/users" element={<AdminUsersPage />} />
                  <Route path="goals"    element={<GoalsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="import" element={<ImportPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </VisibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
