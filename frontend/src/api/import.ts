import client, { getCsrfToken } from './client'
import axios from 'axios'
import type { ApiResponse } from '@/types'

export interface ImportedRow {
  date: string            // data que será salva (pode ser a global)
  original_date: string   // data original do CSV — usada na descrição
  description: string     // editável pelo usuário (já vem com a data concatenada)
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
  transactions: {
    date: string
    description: string
    amount_cents: number
    type: 'income' | 'expense'
    original_category: string
  }[]
}

export const importApi = {
  preview: (file: File, bank: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('bank', bank)
    return client.post<ApiResponse<ImportPreview>>('/import/preview', form)
  },

  confirm: (transactions: ImportedRow[]) =>
    client.post<ApiResponse<{ imported: number }>>('/import/confirm', {
      transactions: transactions.filter(t => t.selected).map(t => ({
        date:         t.date,
        description:  t.description,
        amount_cents: t.amount_cents,
        type:         t.type,
        account_id:   t.account_id,
        category_id:  t.category_id,
        // notes é adicionado automaticamente no backend
      })),
    }),
}
