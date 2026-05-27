import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { transactionsApi, type TransactionPayload, type TransactionFilters } from '@/api/transactions'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Pagination } from '@/components/ui/Pagination'
import { SortHeader } from '@/components/ui/SortHeader'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { formatDate } from '@/utils/format'
import type { Transaction } from '@/types'

const EMPTY_FILTERS: TransactionFilters = {
  type: '', category_id: '', account_id: '',
  date_from: '', date_to: '', amount_from: '', amount_to: '',
  search: '', sort_by: 'date', sort_dir: 'DESC',
}

export function TransactionsPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [page, setPage]         = useState(1)
  const [perPage, setPerPage]   = useState(10)
  const [filters, setFilters]   = useState<TransactionFilters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [editing, setEditing]   = useState<Transaction | null>(null)
  const [form, setForm]         = useState<TransactionPayload | null>(null)
  const [error, setError]       = useState('')

  const { data } = useQuery({
    queryKey: ['transactions', page, perPage, filters],
    queryFn:  () => transactionsApi.list(page, perPage, filters).then(r => r.data.data),
  })

  const { data: allAccounts }   = useQuery({ queryKey: ['accounts-all'],   queryFn: () => accountsApi.listAll().then(r => r.data.data.items) })
  const { data: allCategories } = useQuery({ queryKey: ['categories-all'], queryFn: () => categoriesApi.list().then(r => r.data.data) })

  const catOptions = (allCategories ?? []).map(c => ({ value: String(c.id), label: c.name }))
  const accOptions = (allAccounts   ?? []).map(a => ({ value: String(a.id), label: a.name }))

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionPayload }) => transactionsApi.update(id, data),
    onSuccess:  () => { invalidate(); setEditing(null); setForm(null) },
    onError:    (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao salvar.')
    },
  })

  const deleteMut = useMutation({ mutationFn: transactionsApi.delete, onSuccess: invalidate })

  const openEdit = (tx: Transaction) => {
    setEditing(tx); setError('')
    setForm({
      type:             tx.type as 'income' | 'expense',
      amount:           (tx.amount_cents / 100).toFixed(2).replace('.', ','),
      transaction_date: tx.transaction_date,
      category_id:      String(tx.category_id),
      account_id:       String(tx.account_id),
      description:      tx.description,
      notes:            tx.notes ?? '',
    })
  }

  const closeEdit = () => { setEditing(null); setForm(null); setError('') }
  const setF = (patch: Partial<TransactionPayload>) => setForm(f => f ? { ...f, ...patch } : f)
  const setFilter = (patch: Partial<TransactionFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1) }

  const hasFilters = Object.entries(filters).some(([k, v]) =>
    !['sort_by','sort_dir'].includes(k) && v !== ''
  )

  const handleSort = (field: string, dir: 'ASC' | 'DESC') => {
    setFilters(f => ({ ...f, sort_by: field, sort_dir: dir }))
    setPage(1)
  }

  return (
    <div className="space-y-5">

      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              showFilters || hasFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
            </svg>
            Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
          </button>
          {hasFilters && (
            <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              Limpar filtros ×
            </button>
          )}
        </div>
        <Button onClick={() => navigate('/transactions/new')} size="sm">+ Nova</Button>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Filtrar movimentações</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            {/* Tipo */}
            <Select
              label="Tipo"
              options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]}
              value={filters.type ?? ''}
              onChange={e => setFilter({ type: e.target.value })}
              placeholder="Todos"
            />

            {/* Categoria */}
            <Select
              label="Categoria"
              options={catOptions}
              value={filters.category_id ?? ''}
              onChange={e => setFilter({ category_id: e.target.value })}
              placeholder="Todas"
            />

            {/* Conta */}
            <Select
              label="Conta"
              options={accOptions}
              value={filters.account_id ?? ''}
              onChange={e => setFilter({ account_id: e.target.value })}
              placeholder="Todas"
            />

            {/* Busca */}
            <Input
              label="Descrição"
              value={filters.search ?? ''}
              onChange={e => setFilter({ search: e.target.value })}
              placeholder="Buscar..."
            />

            {/* Data de */}
            <Input
              label="Data inicial"
              type="date"
              value={filters.date_from ?? ''}
              onChange={e => setFilter({ date_from: e.target.value })}
            />

            {/* Data até */}
            <Input
              label="Data final"
              type="date"
              value={filters.date_to ?? ''}
              onChange={e => setFilter({ date_to: e.target.value })}
            />

            {/* Valor de */}
            <Input
              label="Valor mínimo"
              prefix="R$"
              value={filters.amount_from ?? ''}
              onChange={e => setFilter({ amount_from: e.target.value })}
              placeholder="0,00"
            />

            {/* Valor até */}
            <Input
              label="Valor máximo"
              prefix="R$"
              value={filters.amount_to ?? ''}
              onChange={e => setFilter({ amount_to: e.target.value })}
              placeholder="0,00"
            />
          </div>
        </div>
      )}

      {/* Formulário de edição */}
      {editing && form && (
        <Card title="Editar Movimentação">
          <div className="px-6 pb-6 space-y-5">
            {error && <Alert type="error" message={error} />}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-3">
                {(['expense','income'] as const).map(t => (
                  <label key={t} className="cursor-pointer">
                    <input type="radio" className="sr-only" value={t} checked={form.type === t} onChange={() => setF({ type: t })} />
                    <div className={`flex items-center justify-center gap-2 border-2 rounded-xl py-3 text-sm font-medium transition-all ${
                      form.type === t
                        ? t === 'expense' ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                          : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    }`}>
                      {t === 'expense' ? 'Despesa' : 'Receita'}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Valor" prefix="R$" value={form.amount} onChange={e => setF({ amount: e.target.value })} required />
              <Input label="Data" type="date" value={form.transaction_date} onChange={e => setF({ transaction_date: e.target.value })} required />
              <Select label="Categoria" options={catOptions} value={form.category_id} onChange={e => setF({ category_id: e.target.value })} placeholder="Selecione..." required />
              <Select label="Conta"     options={accOptions} value={form.account_id}  onChange={e => setF({ account_id:  e.target.value })} placeholder="Selecione..." required />
            </div>
            <Input label="Descrição" value={form.description} onChange={e => setF({ description: e.target.value })} required />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeEdit} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => updateMut.mutate({ id: String(editing.id), data: form })}
                loading={updateMut.isPending}
                className={`flex-1 ${form.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                Salvar alterações
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela */}
      <Card title={`Movimentações ${data?.total ? `(${data.total})` : ''}`}>
        {(data?.items ?? []).length === 0
          ? (
            <div className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
              {hasFilters ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhuma movimentação cadastrada.'}
            </div>
          )
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <SortHeader label="Descrição" field="description" current={filters.sort_by!} direction={filters.sort_dir as 'ASC'|'DESC'} onChange={handleSort} />
                      <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Categoria</th>
                      <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Conta</th>
                      <SortHeader label="Data" field="date" current={filters.sort_by!} direction={filters.sort_dir as 'ASC'|'DESC'} onChange={handleSort} />
                      <SortHeader label="Valor" field="amount" current={filters.sort_by!} direction={filters.sort_dir as 'ASC'|'DESC'} onChange={handleSort} className="text-right" />
                      <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {(data?.items ?? []).map(tx => (
                      <tr key={tx.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${editing?.id === tx.id ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                              <svg className={`w-4 h-4 ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'income' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} />
                              </svg>
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{tx.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {tx.category_color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tx.category_color }} />}
                            <span className="text-slate-500 dark:text-slate-400">{tx.category_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{tx.account_name ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                        <td className="px-6 py-4 text-right">
                          <MoneyValue cents={tx.amount_cents} showSign className="font-semibold"
                            positiveClass="text-emerald-600 dark:text-emerald-400"
                            negativeClass="text-red-500 dark:text-red-400" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => editing?.id === tx.id ? closeEdit() : openEdit(tx)}
                              className={`p-1.5 rounded-lg transition-all ${editing?.id === tx.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => confirm('Excluir?') && deleteMut.mutate(String(tx.id))}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={data?.total_pages ?? 1} perPage={perPage} total={data?.total ?? 0}
                onPageChange={setPage} onPerPageChange={p => { setPerPage(p); setPage(1) }} />
            </>
          )
        }
      </Card>
    </div>
  )
}
