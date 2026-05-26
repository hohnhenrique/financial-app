import client from './client'
import type { ApiResponse, Account } from '@/types'

export interface AccountPayload {
  name: string
  type: string
  initial_balance?: string
  color?: string
  is_hidden?: boolean
}

export const accountsApi = {
  list: () => client.get<ApiResponse<Account[]>>('/accounts'),
  create: (data: AccountPayload) => client.post<ApiResponse<Account>>('/accounts', data),
  update: (id: string, data: AccountPayload) => client.put<ApiResponse<Account>>(`/accounts/${id}`, data),
  delete: (id: string) => client.delete<ApiResponse>(`/accounts/${id}`),
}
