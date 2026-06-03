import client from './client'
import type { ApiResponse } from '@/types'

export interface CategoryBudget {
  id: string; category_id: string; category_name: string
  category_color: string; category_type: string
  budget_cents: number; spent_cents: number; year_month: string
}

export const budgetApi = {
  list:   (yearMonth: string) => client.get<ApiResponse<CategoryBudget[]>>('/budgets', { params: { year_month: yearMonth } }),
  upsert: (data: { category_id: string; year_month: string; budget: string }) =>
    client.post<ApiResponse<null>>('/budgets', data),
}
