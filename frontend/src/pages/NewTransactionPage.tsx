import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useMoneyInput } from '@/hooks/useMoneyInput'
import { useToast } from '@/context/ToastContext'
import { formatMoney } from '@/utils/format'

function todayISO() { return new Date().toISOString().split('T')[0] }

export function NewTransactionPage() {
  const qc    = useQueryClient()
  const toast = useToast()

  const [type,        setType]        = useState<'expense'|'income'>('expense')
  const [date,        setDate]        = useState(todayISO())
  const [categoryId,  setCategoryId]  = useState('')
  const [accountId,   setAccountId]   = useState('')
  const [description, setDescription] = useState('')
  const [notes,       setNotes]       = useState('')
  const [saved,       setSaved]       = useState(0) // conta quantas foram salvas na sessão
  const money = useMoneyInput(0)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'], queryFn: () => accountsApi.listAll().then(r => r.data.data),
    staleTime: 0, refetchOnMount: true,
  })
  const { data: categories } = useQuery({
    queryKey: ['categories-all'], queryFn: () => categoriesApi.list().then(r => r.data.data),
    staleTime: 0, refetchOnMount: true,
  })

  const accounts   = accountsData?.items ?? []
  const catOptions = (categories ?? []).filter(c => !c.is_archived && (c.type === type || c.type === 'both')).map(c => ({ value: String(c.id), label: c.name }))
  const accOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))

  const createMut = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSaved(s => s + 1)
      // Reseta só descrição, notas e valor — mantém conta, categoria e data
      setDescription('')
      setNotes('')
      money.reset(0)
      toast.success(`${type === 'income' ? 'Receita' : 'Despesa'} de ${formatMoney(money.rawCents)} salva!`)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao salvar.')
    },
  })

  const handleSubmit = () => {
    if (!description.trim()) { toast.error('Informe uma descrição.'); return }
    if (money.rawCents === 0) { toast.error('Informe um valor maior que zero.'); return }
    if (!categoryId)           { toast.error('Selecione uma categoria.'); return }
    if (!accountId)            { toast.error('Selecione uma conta.'); return }
    createMut.mutate({ type, amount: money.apiValue, transaction_date: date, category_id: categoryId, account_id: accountId, description: description.trim(), notes: notes.trim() })
  }

  const isIncome = type === 'income'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header visual */}
      <div className={`rounded-3xl p-8 mb-6 relative overflow-hidden transition-all duration-500 ${
        isIncome ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'
      }`}>
        {/* Círculos decorativos */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-8 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-white/70 text-sm font-medium mb-1 uppercase tracking-wide">
            {isIncome ? 'Nova Receita' : 'Nova Despesa'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-white/80 text-2xl font-light">R$</span>
            <span className="text-white text-5xl font-bold tabular-nums leading-none">
              {money.rawCents > 0
                ? formatMoney(money.rawCents).replace('R$\u00a0', '')
                : '0,00'
              }
            </span>
          </div>

          {saved > 0 && (
            <p className="text-white/60 text-xs mt-3">
              ✓ {saved} movimentação{saved > 1 ? 'ões' : ''} salva{saved > 1 ? 's' : ''} nesta sessão
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Seletor de tipo */}
        <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-700">
          {(['expense','income'] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setCategoryId('') }}
              className={`py-4 text-sm font-semibold transition-all ${
                type === t
                  ? t === 'expense'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-500'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}>
              <span className="mr-2">{t === 'expense' ? '↓' : '↑'}</span>
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {/* Valor */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Valor</label>
            <MoneyInput value={money.displayValue} onChange={money.onChange} required
              className="text-2xl font-bold h-16 text-center" />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Descrição</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={isIncome ? 'Ex: Salário, Freelance, Dividendos...' : 'Ex: Supermercado, Conta de luz...'}
              className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Data + Conta lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Data</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Conta</label>
              <Select options={accOptions} value={accountId} onChange={e => setAccountId(e.target.value)} placeholder={accOptions.length === 0 ? 'Carregando...' : 'Selecione...'} required />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Categoria</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {catOptions.map(c => (
                <button key={c.value} onClick={() => setCategoryId(c.value)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    categoryId === c.value
                      ? 'text-white border-transparent shadow-sm'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                  style={categoryId === c.value ? { backgroundColor: isIncome ? '#10b981' : '#ef4444', borderColor: isIncome ? '#10b981' : '#ef4444' } : undefined}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anotações (opcional, colapsável) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Anotações <span className="font-normal normal-case text-slate-300 dark:text-slate-600">(opcional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Observações, comprovantes, contexto..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none" />
          </div>

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className={`w-full py-4 rounded-2xl text-white text-base font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${
              isIncome
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {createMut.isPending
              ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Salvando...</>
              : <>{isIncome ? '↑ Salvar Receita' : '↓ Salvar Despesa'}</>
            }
          </button>

          {saved > 0 && (
            <button onClick={() => window.location.href = '/transactions'}
              className="w-full py-3 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Ver todas as movimentações →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
