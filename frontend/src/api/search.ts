import client from './client'
import type { ApiResponse } from '@/types'

export interface SearchResult {
  id: string; label: string; type_name: string
  amount_cents?: number; type?: string; date?: string
  status?: string; color?: string
}
export interface SearchData { query: string; results: SearchResult[] }

export const searchApi = {
  search: (q: string) => client.get<ApiResponse<SearchData>>('/search', { params: { q } }),
}
