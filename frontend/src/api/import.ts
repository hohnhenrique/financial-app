import client, { getCsrfToken } from './client'
import axios from 'axios'
import type { ApiResponse } from '@/types'

export interface ImportedRow {
  date: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  original_category: string
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

    // Usa axios direto mas injeta o CSRF manualmente (FormData não usa Content-Type: json)
    return axios.post<ApiResponse<ImportPreview>>('/api/import/preview', form, {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-CSRF-Token': getCsrfToken(),
      },
    })
  },

  confirm: (transactions: ImportedRow[]) =>
    client.post<ApiResponse<{ imported: number; skipped: number }>>('/api/import/confirm', {
      transactions: transactions.filter(t => t.selected).map(t => ({
        date:         t.date,
        description:  t.description,
        amount_cents: t.amount_cents,
        type:         t.type,
        account_id:   t.account_id,
        category_id:  t.category_id,
      })),
    }),
}
