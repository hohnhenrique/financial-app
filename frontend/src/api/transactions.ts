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

export interface TransactionFilters {
  type?: string
  category_id?: string
  account_id?: string
  date_from?: string
  date_to?: string
  amount_from?: string
  amount_to?: string
  search?: string
  sort_by?: string
  sort_dir?: string
  page?: number
  per_page?: number
}

export const transactionsApi = {
  list: (page = 1, perPage = 10, filters: Omit<TransactionFilters, 'page'|'per_page'> = {}) =>
    client.get<ApiResponse<PaginatedResponse<Transaction>>>('/transactions', {
      params: { page, per_page: perPage, ...filters },
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
