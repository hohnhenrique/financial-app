import client from './client'
import type { ApiResponse, PaginatedResponse, Transaction } from '@/types'

export interface TransactionPayload {
  type: 'income' | 'expense'
  amount: string
  transaction_date: string
  category_id: string
  account_id: string
  description: string
  notes?: string
}

export const transactionsApi = {
  list: (page = 1, perPage = 10) =>
    client.get<ApiResponse<PaginatedResponse<Transaction>>>('/transactions', {
      params: { page, per_page: perPage },
    }),

  get: (id: string) =>
    client.get<ApiResponse<Transaction>>(`/transactions/${id}`),

  create: (data: TransactionPayload) =>
    client.post<ApiResponse<Transaction>>('/transactions', data),

  update: (id: string, data: TransactionPayload) =>
    client.put<ApiResponse<Transaction>>(`/transactions/${id}`, data),

  delete: (id: string) =>
    client.delete<ApiResponse>(`/transactions/${id}`),
}
