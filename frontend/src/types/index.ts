export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'wallet' | 'investment' | 'credit_card'
  currency: string
  initial_balance_cents: number
  color: string
  is_hidden: boolean
  created_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: 'income' | 'expense' | 'both'
  color: string
  icon: string
  is_archived: boolean
  is_global: boolean
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  type: 'income' | 'expense' | 'transfer'
  amount_cents: number
  description: string
  notes: string | null
  transaction_date: string
  category_name: string | null
  account_name: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiResponse<T = null> {
  success: boolean
  message: string
  data: T
}

export interface DashboardSummary {
  total_income: number
  total_expense: number
}

export interface ChartMonth {
  month: string
  label: string
  income: number
  expense: number
  balance: number
}

export interface CategoryExpense {
  name: string
  color: string
  total: number
}

export interface DashboardData {
  summary: DashboardSummary
  chart_months: ChartMonth[]
  expenses_by_category: CategoryExpense[]
  recent_transactions: Transaction[]
}
