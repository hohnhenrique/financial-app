import client from './client'
import type { ApiResponse, Account } from '@/types'

export interface AccountPayload {
  name: string
  type: string
  initial_balance?: string
  color?: string
  is_hidden?: boolean
}

export interface AccountListParams {
  page?: number
  per_page?: number
  sort_by?: string
  sort_dir?: string
}

export interface AccountPaginated {
  items: Account[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export const accountsApi = {
  list:   (params?: AccountListParams) => client.get<ApiResponse<AccountPaginated>>('/accounts', { params }),
  listAll: () => client.get<ApiResponse<AccountPaginated>>('/accounts', { params: { per_page: 100 } }),
  create: (data: AccountPayload) => client.post<ApiResponse<Account>>('/accounts', data),
  update: (id: string, data: AccountPayload) => client.put<ApiResponse<Account>>(`/accounts/${id}`, data),
  delete: (id: string) => client.delete<ApiResponse>(`/accounts/${id}`),
}
