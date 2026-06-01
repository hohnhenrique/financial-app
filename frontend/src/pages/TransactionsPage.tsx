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
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useMoneyInput } from '@/hooks/useMoneyInput'
import { useToast } from '@/context/ToastContext'
import { formatDate } from '@/utils/format'
import type { Transaction } from '@/types'

// ── Filtros padrão ────────────────────────────────────────────────────────────
const EMPTY_FILTERS: TransactionFilters = {
  type:        '',
  category_id: '',
  account_id:  '',
  date_from:   '',
  date_to:     '',
  amount_from: '',
  amount_to:   '',
  search:      '',
  sort_by:     'date',
  sort_dir:    'DESC',
}

// ── Estado inicial do formulário de edição ────────────────────────────────────
function emptyForm(): TransactionPayload {
  return {
    type:             'expense',
    amount:           '',
    transaction_date: new Date().toISOString().split('T')[0],
    category_id:      '',
    account_id:       '',
    description:      '',
    notes:            '',
  }
}

export function TransactionsPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const toast    = useToast()

  // ── Paginação e filtros ───────────────────────────────────────────────────
  const [page, setPage]               = useState(1)
  const [perPage, setPerPage]         = useState(10)
  const [filters, setFilters]         = useState<TransactionFilters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  // ── Edição inline ─────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm]       = useState<TransactionPayload>(emptyForm())
  const editMoney             = useMoneyInput(0)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', page, perPage, filters],
    queryFn:  () => transactionsApi.list(page, perPage, filters).then(r => r.data.data),
    placeholderData: (prev) => prev, // mantém dados anteriores enquanto refetch (evita tela azul)
  })

  const { data: accountsData } = useQuery({
    queryKey:       ['accounts-all'],
    queryFn:        () => accountsApi.listAll().then(r => r.data.data),
    staleTime:      0,
    refetchOnMount: true,
  })

  const { data: categories } = useQuery({
    queryKey:       ['categories-all'],
    queryFn:        () => categoriesApi.list().then(r => r.data.data),
    staleTime:      0,
    refetchOnMount: true,
  })

  const accounts   = accountsData?.items ?? []
  const catOptions = (categories ?? []).filter(c => !c.is_archived).map(c => ({ value: String(c.id), label: c.name }))
  const accOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionPayload }) =>
        transactionsApi.update(id, data),
    onSuccess: () => {
      invalidate()
      closeEdit()
      toast.success('Movimentação atualizada!')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao salvar movimentação.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess:  () => { invalidate(); toast.success('Movimentação excluída.') },
    onError:    () => toast.error('Erro ao excluir movimentação.'),
  })

  // ── Helpers de filtro ─────────────────────────────────────────────────────
  const setFilter = (patch: Partial<TransactionFilters>) => {
    setFilters(f => ({ ...f, ...patch }))
    setPage(1)
  }

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(1) }

  const handleSort = (field: string, dir: 'ASC' | 'DESC') => {
    setFilters(f => ({ ...f, sort_by: field, sort_dir: dir }))
    setPage(1)
  }

  const hasFilters = Object.entries(filters).some(
      ([k, v]) => !['sort_by', 'sort_dir'].includes(k) && v !== ''
  )

  // ── Helpers de edição ─────────────────────────────────────────────────────
  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    editMoney.reset(tx.amount_cents)
    setForm({
      type:             tx.type as 'income' | 'expense',
      amount:           editMoney.apiValue,
      transaction_date: tx.transaction_date,
      category_id:      String(tx.category_id),
      account_id:       String(tx.account_id),
      description:      tx.description,
      notes:            tx.notes ?? '',
    })
  }

  const closeEdit = () => {
    setEditing(null)
    setForm(emptyForm())
    editMoney.reset(0)
  }

  const setF = (patch: Partial<TransactionPayload>) =>
      setForm(f => ({ ...f, ...patch }))

  const handleSaveEdit = () => {
    if (!editing) return
    updateMut.mutate({
      id:   String(editing.id),
      data: { ...form, amount: editMoney.apiValue },
    })
  }

  // ── Confirmação de exclusão ───────────────────────────────────────────────
  const handleDelete = (tx: Transaction) => {
    if (!window.confirm(`Excluir "${tx.description}"?`)) return
    deleteMut.mutate(String(tx.id))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-5">

        {/* Barra de ações */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    showFilters || hasFilters
                        ? 'text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
                style={showFilters || hasFilters
                    ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                    : undefined
                }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
              </svg>
              Filtros
              {hasFilters && (
                  <span className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
              )}
            </button>

            {hasFilters && (
                <button
                    onClick={clearFilters}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Limpar filtros
                </button>
            )}

            {/* Indicador de carregamento */}
            {isFetching && (
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                     style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            )}
          </div>

          <Button onClick={() => navigate('/transactions/new')} size="sm">
            + Nova
          </Button>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-6 py-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Filtrar movimentações</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                <Select
                    label="Tipo"
                    options={[
                      { value: 'income',  label: '↑ Receitas' },
                      { value: 'expense', label: '↓ Despesas' },
                    ]}
                    value={filters.type ?? ''}
                    onChange={e => setFilter({ type: e.target.value })}
                    placeholder="Todos"
                />

                <Select
                    label="Categoria"
                    options={catOptions}
                    value={filters.category_id ?? ''}
                    onChange={e => setFilter({ category_id: e.target.value })}
                    placeholder="Todas"
                />

                <Select
                    label="Conta"
                    options={accOptions}
                    value={filters.account_id ?? ''}
                    onChange={e => setFilter({ account_id: e.target.value })}
                    placeholder="Todas"
                />

                <Input
                    label="Descrição"
                    value={filters.search ?? ''}
                    onChange={e => setFilter({ search: e.target.value })}
                    placeholder="Buscar..."
                />

                <Input
                    label="Data inicial"
                    type="date"
                    value={filters.date_from ?? ''}
                    onChange={e => setFilter({ date_from: e.target.value })}
                />

                <Input
                    label="Data final"
                    type="date"
                    value={filters.date_to ?? ''}
                    onChange={e => setFilter({ date_to: e.target.value })}
                />

                <Input
                    label="Valor mínimo"
                    prefix="R$"
                    value={filters.amount_from ?? ''}
                    onChange={e => setFilter({ amount_from: e.target.value })}
                    placeholder="0,00"
                />

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

        {/* Formulário de edição inline */}
        {editing && (
            <Card title={`Editando: ${editing.description}`}>
              <div className="px-6 pb-6 pt-5 space-y-5">

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['expense', 'income'] as const).map(t => (
                        <label key={t} className="cursor-pointer">
                          <input type="radio" className="sr-only" value={t}
                                 checked={form.type === t} onChange={() => setF({ type: t })} />
                          <div className={`flex items-center justify-center gap-2 border-2 rounded-xl py-3 text-sm font-medium transition-all ${
                              form.type === t
                                  ? t === 'expense'
                                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                      : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MoneyInput
                      label="Valor"
                      value={editMoney.displayValue}
                      onChange={editMoney.onChange}
                      required
                  />
                  <Input
                      label="Data"
                      type="date"
                      value={form.transaction_date}
                      onChange={e => setF({ transaction_date: e.target.value })}
                      required
                  />
                </div>

                {/* Categoria + Conta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                      label="Categoria"
                      options={catOptions}
                      value={form.category_id}
                      onChange={e => setF({ category_id: e.target.value })}
                      placeholder="Selecione..."
                      required
                  />
                  <Select
                      label="Conta"
                      options={accOptions}
                      value={form.account_id}
                      onChange={e => setF({ account_id: e.target.value })}
                      placeholder="Selecione..."
                      required
                  />
                </div>

                {/* Descrição */}
                <Input
                    label="Descrição"
                    value={form.description}
                    onChange={e => setF({ description: e.target.value })}
                    required
                />

                {/* Botões */}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={closeEdit} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                      onClick={handleSaveEdit}
                      loading={updateMut.isPending}
                      className={`flex-1 ${
                          form.type === 'income'
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : 'bg-red-500 hover:bg-red-600'
                      }`}
                  >
                    Salvar alterações
                  </Button>
                </div>
              </div>
            </Card>
        )}

        {/* Tabela */}
        <Card title={`Movimentações${data?.total ? ` (${data.total.toLocaleString('pt-BR')})` : ''}`}>
          {isLoading && !data
              ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-7 h-7 border-4 border-t-transparent rounded-full"
                         style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                  </div>
              )
              : (data?.items ?? []).length === 0
                  ? (
                      <div className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 text-sm space-y-3">
                        <svg className="w-10 h-10 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p>
                          {hasFilters
                              ? 'Nenhum resultado para os filtros aplicados.'
                              : 'Nenhuma movimentação cadastrada.'
                          }
                        </p>
                        {!hasFilters && (
                            <button
                                onClick={() => navigate('/transactions/new')}
                                className="text-sm font-medium hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                            >
                              Cadastrar primeira movimentação →
                            </button>
                        )}
                      </div>
                  )
                  : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                              <SortHeader
                                  label="Descrição"
                                  field="description"
                                  current={filters.sort_by!}
                                  direction={filters.sort_dir as 'ASC' | 'DESC'}
                                  onChange={handleSort}
                              />
                              <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">
                                Categoria
                              </th>
                              <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">
                                Conta
                              </th>
                              <SortHeader
                                  label="Data"
                                  field="date"
                                  current={filters.sort_by!}
                                  direction={filters.sort_dir as 'ASC' | 'DESC'}
                                  onChange={handleSort}
                              />
                              <SortHeader
                                  label="Valor"
                                  field="amount"
                                  current={filters.sort_by!}
                                  direction={filters.sort_dir as 'ASC' | 'DESC'}
                                  onChange={handleSort}
                                  className="text-right"
                              />
                              <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-center">
                                Ações
                              </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {(data?.items ?? []).map(tx => {
                              const isExpense  = tx.type === 'expense'
                              const isEditing  = editing?.id === tx.id

                              return (
                                  <tr
                                      key={tx.id}
                                      className={`transition-colors ${
                                          isEditing
                                              ? 'bg-blue-50/40 dark:bg-blue-900/10'
                                              : isExpense
                                                  ? 'hover:bg-red-50/30 dark:hover:bg-red-900/5'
                                                  : 'hover:bg-emerald-50/20 dark:hover:bg-emerald-900/5'
                                      }`}
                                  >
                                    {/* Descrição */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        {/* Ícone de tipo */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isExpense
                                                ? 'bg-red-100 dark:bg-red-900/30'
                                                : 'bg-emerald-100 dark:bg-emerald-900/30'
                                        }`}>
                                          <svg
                                              className={`w-4 h-4 ${isExpense ? 'text-red-500' : 'text-emerald-500'}`}
                                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d={isExpense ? 'M17 13l-5 5m0 0l-5-5m5 5V6' : 'M7 11l5-5m0 0l5 5m-5-5v12'} />
                                          </svg>
                                        </div>

                                        <div className="min-w-0">
                                          <p className={`font-medium truncate max-w-[160px] ${
                                              isExpense
                                                  ? 'text-slate-700 dark:text-slate-200'
                                                  : 'text-slate-700 dark:text-slate-200'
                                          }`}>
                                            {tx.description}
                                          </p>
                                          <span className={`text-[10px] font-semibold ${
                                              isExpense
                                                  ? 'text-red-500 dark:text-red-400'
                                                  : 'text-emerald-600 dark:text-emerald-400'
                                          }`}>
                                    {isExpense ? '↓ Saída' : '↑ Entrada'}
                                  </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Categoria */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        {tx.category_color && (
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ background: tx.category_color }}
                                            />
                                        )}
                                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                                  {tx.category_name ?? '—'}
                                </span>
                                      </div>
                                    </td>

                                    {/* Conta */}
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                      {tx.account_name ?? '—'}
                                    </td>

                                    {/* Data */}
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                      {formatDate(tx.transaction_date)}
                                    </td>

                                    {/* Valor — vermelho para saída, verde para entrada */}
                                    <td className="px-6 py-4 text-right">
                                      <MoneyValue
                                          cents={tx.amount_cents}
                                          showSign
                                          className={`font-bold text-base ${
                                              isExpense
                                                  ? 'text-red-600 dark:text-red-400'
                                                  : 'text-emerald-600 dark:text-emerald-400'
                                          }`}
                                          positiveClass="text-emerald-600 dark:text-emerald-400"
                                          negativeClass="text-red-600 dark:text-red-400"
                                      />
                                    </td>

                                    {/* Ações */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-1">
                                        {/* Editar */}
                                        <button
                                            onClick={() => isEditing ? closeEdit() : openEdit(tx)}
                                            title={isEditing ? 'Fechar edição' : 'Editar'}
                                            className={`p-1.5 rounded-lg transition-all ${
                                                isEditing
                                                    ? 'text-white'
                                                    : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            }`}
                                            style={isEditing
                                                ? { backgroundColor: 'var(--color-primary)' }
                                                : undefined
                                            }
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                          </svg>
                                        </button>

                                        {/* Excluir */}
                                        <button
                                            onClick={() => handleDelete(tx)}
                                            title="Excluir"
                                            disabled={deleteMut.isPending}
                                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-40"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                              )
                            })}
                            </tbody>
                          </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={data?.total_pages ?? 1}
                            perPage={perPage}
                            total={data?.total ?? 0}
                            onPageChange={setPage}
                            onPerPageChange={p => { setPerPage(p); setPage(1) }}
                        />
                      </>
                  )
          }
        </Card>
      </div>
  )
}