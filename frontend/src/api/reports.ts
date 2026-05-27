import client from './client'
import type { ApiResponse } from '@/types'

export interface ReportFilters {
  type?: string
  category_id?: string
  account_id?: string
  date_from?: string
  date_to?: string
  amount_from?: string
  amount_to?: string
  year_month?: string
}

export interface ReportTransaction {
  id: string
  type: string
  amount_cents: number
  description: string
  transaction_date: string
  category_name: string | null
  category_color: string
  account_name: string | null
}

export interface CategoryReport {
  category_name: string
  category_color: string
  type: string
  total: number
  qty: number
  min_amount: number
  max_amount: number
  avg_amount: number
}

export interface ReportData {
  filters: ReportFilters
  total_income: number
  total_expense: number
  balance: number
  count: number
  transactions: ReportTransaction[]
  by_category: CategoryReport[]
}

export const reportsApi = {
  summary: (filters: ReportFilters) =>
    client.get<ApiResponse<ReportData>>('/reports/summary', { params: filters }),
}
