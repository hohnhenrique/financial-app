import client from './client'
import type { ApiResponse, Category } from '@/types'

export interface CategoryPayload {
  name: string
  type: string
  color?: string
  icon?: string
}

export const categoriesApi = {
  list: () => client.get<ApiResponse<Category[]>>('/categories'),
  create: (data: CategoryPayload) => client.post<ApiResponse<Category>>('/categories', data),
  update: (id: string, data: CategoryPayload) => client.put<ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: string) => client.delete<ApiResponse>(`/categories/${id}`),
}
