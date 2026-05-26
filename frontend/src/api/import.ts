import axios from 'axios'
import type { ApiResponse } from '@/types'

export interface ImportedRow {
  date: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  original_category: string
  // campos de seleção pelo usuário
  selected: boolean
  account_id: string
  category_id: string
}

export interface ImportPreview {
  bank: string
  total: number
  transactions: Omit<ImportedRow, 'selected' | 'account_id' | 'category_id'>[]
}

export const importApi = {
  preview: (file: File, bank: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('bank', bank)
    return axios.post<ApiResponse<ImportPreview>>('/api/import/preview', form, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  confirm: (transactions: ImportedRow[]) =>
    axios.post<ApiResponse<{ imported: number; skipped: number }>>('/api/import/confirm', {
      transactions: transactions.filter(t => t.selected).map(t => ({
        date:        t.date,
        description: t.description,
        amount_cents: t.amount_cents,
        type:        t.type,
        account_id:  t.account_id,
        category_id: t.category_id,
      })),
    }, { withCredentials: true }),
}
