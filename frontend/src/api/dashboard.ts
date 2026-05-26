import client from './client'
import type { ApiResponse, DashboardData } from '@/types'

export const dashboardApi = {
  get: (month?: string) =>
    client.get<ApiResponse<DashboardData>>('/dashboard', {
      params: month ? { month } : {},
    }),
}
