import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, type TransactionPayload } from '@/api/transactions'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'

const EMPTY: TransactionPayload = {
  type: 'expense',
  amount: '',
  transaction_date: new Date().toISOString().split('T')[0],
  category_id: '',
  account_id: '',
  description: '',
  notes: '',
}

export function NewTransactionPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<TransactionPayload>(EMPTY)
  const [error, setError] = useState('')

  const { data: accounts }   = useQuery({ queryKey: ['accounts'],   queryFn: () => accountsApi.list().then(r => r.data.data) })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list().then(r => r.data.data) })

  const catOptions = (categories ?? []).filter(c => !c.is_archived).map(c => ({ value: String(c.id), label: c.name }))
  const accOptions = (accounts ?? []).map(a => ({ value: String(a.id), label: a.name }))

  const createMut = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/transactions')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao salvar.')
    },
  })

  const set = (patch: Partial<TransactionPayload>) => setForm(f => ({ ...f, ...patch }))

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Nova Movimentação" subtitle="Preencha os dados da receita ou despesa.">
        <div className="px-6 pb-6 space-y-6">
          {error && <Alert type="error" message={error} />}

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Tipo <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['expense', 'income'] as const).map(t => (
                <label key={t} className="cursor-pointer">
                  <input
                    type="radio"
                    className="sr-only"
                    value={t}
                    checked={form.type === t}
                    onChange={() => set({ type: t })}
                  />
                  <div className={`flex items-center justify-center gap-2 border-2 rounded-xl py-3 text-sm font-medium transition-all ${
                    form.type === t
                      ? t === 'expense'
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={t === 'expense' ? 'M17 13l-5 5m0 0l-5-5m5 5V6' : 'M7 11l5-5m0 0l5 5m-5-5v12'} />
                    </svg>
                    {t === 'expense' ? 'Despesa' : 'Receita'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Valor"
              prefix="R$"
              value={form.amount}
              onChange={e => set({ amount: e.target.value })}
              placeholder="0,00"
              required
            />
            <Input
              label="Data"
              type="date"
              value={form.transaction_date}
              onChange={e => set({ transaction_date: e.target.value })}
              required
            />
          </div>

          {/* Categoria + Conta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="Categoria"
              options={catOptions}
              value={form.category_id}
              onChange={e => set({ category_id: e.target.value })}
              placeholder="Selecione..."
              required
            />
            <Select
              label="Conta"
              options={accOptions}
              value={form.account_id}
              onChange={e => set({ account_id: e.target.value })}
              placeholder="Selecione..."
              required
            />
          </div>

          {/* Descrição */}
          <Input
            label="Descrição"
            value={form.description}
            onChange={e => set({ description: e.target.value })}
            placeholder="Ex: Supermercado, Salário de maio..."
            required
          />

          {/* Anotações */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Anotações{' '}
              <span className="font-normal text-xs text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set({ notes: e.target.value })}
              rows={3}
              placeholder="Informações adicionais..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl
                         bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
                         placeholder-slate-400 dark:placeholder-slate-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         transition-all resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/transactions')}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createMut.mutate(form)}
              loading={createMut.isPending}
              className={`flex-1 ${
                form.type === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Salvar movimentação
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
