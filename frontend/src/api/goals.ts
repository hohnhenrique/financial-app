import client from './client'
import type { ApiResponse } from '@/types'

export interface MonthlyGoal {
  id: string
  year_month: string
  income_goal: number
  expense_goal: number
  notes: string | null
}

export interface GoalStatus {
  goal: MonthlyGoal | null
  year_month: string
  income_goal: number
  expense_goal: number
  real_income: number
  real_expense: number
  projected_balance: number
  real_balance: number
  income_pct: number | null
  expense_pct: number | null
}

export const goalsApi = {
  list: () => client.get<ApiResponse<MonthlyGoal[]>>('/goals'),
  forMonth: (ym: string) => client.get<ApiResponse<GoalStatus>>(`/goals/${ym}`),
  upsert: (data: { year_month: string; income_goal: string; expense_goal: string; notes?: string }) =>
    client.post<ApiResponse<null>>('/goals', data),
  delete: (id: string) => client.delete<ApiResponse<null>>(`/goals/${id}`),
}
