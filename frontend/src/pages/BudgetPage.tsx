import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetApi } from '@/api/budget'
import { categoriesApi } from '@/api/categories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useMoneyInput } from '@/hooks/useMoneyInput'
import { useToast } from '@/context/ToastContext'
import { formatMoney } from '@/utils/format'

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function currentYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function monthLabel(ym: string) {
  const [y,m] = ym.split('-'); return `${MONTHS_PT[parseInt(m)-1]} ${y}`
}

export function BudgetPage() {
  const qc    = useToast()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [ym, setYm]               = useState(currentYM())
  const [selectedCat, setSelectedCat] = useState('')
  const money = useMoneyInput(0)

  const { data: budgets } = useQuery({
    queryKey: ['budgets', ym],
    queryFn:  () => budgetApi.list(ym).then(r => r.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn:  () => categoriesApi.list().then(r => r.data.data),
  })

  const expenseCats = (categories ?? []).filter(c => c.type !== 'income' && !c.is_archived)

  const upsertMut = useMutation({
    mutationFn: () => budgetApi.upsert({ category_id: selectedCat, year_month: ym, budget: money.apiValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Orçamento salvo!')
      setSelectedCat(''); money.reset(0)
    },
    onError: () => toast.error('Erro ao salvar orçamento.'),
  })

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    return { value: val, label: monthLabel(val) }
  })

  const totalBudget = (budgets ?? []).reduce((s, b) => s + b.budget_cents, 0)
  const totalSpent  = (budgets ?? []).reduce((s, b) => s + b.spent_cents, 0)

  return (
    <div className="space-y-6">
      {/* Header com seletor de mês */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Orçamento por Categoria</h1>
          <p className="text-sm text-slate-400 mt-0.5">Defina limites de gasto por categoria</p>
        </div>
        <select value={ym} onChange={e => setYm(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm focus:outline-none">
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        {/* Form */}
        <Card title="Definir orçamento" subtitle={`Para ${monthLabel(ym)}`} padding>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Categoria *</label>
              <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Selecione a categoria...</option>
                {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <MoneyInput label="Limite do mês" value={money.displayValue} onChange={money.onChange} required />
            <Button onClick={() => upsertMut.mutate()} loading={upsertMut.isPending}
              disabled={!selectedCat} className="w-full">
              Salvar orçamento
            </Button>
          </div>
        </Card>

        {/* Lista */}
        <div className="space-y-5">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total orçado',    value: totalBudget, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Total gasto',     value: totalSpent,  color: 'text-red-500 dark:text-red-400' },
              { label: 'Saldo restante',  value: totalBudget - totalSpent, color: totalBudget - totalSpent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center shadow-sm">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{c.label}</p>
                <p className={`text-lg font-bold ${c.color}`}>{formatMoney(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Cards por categoria */}
          {(budgets ?? []).length === 0
            ? <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 text-sm">
                Nenhum orçamento definido para {monthLabel(ym)}.
              </div>
            : <div className="space-y-3">
                {(budgets ?? []).map(b => {
                  const pct    = b.budget_cents > 0 ? Math.min(100, Math.round(b.spent_cents / b.budget_cents * 100)) : 0
                  const isOver = b.spent_cents > b.budget_cents
                  const remaining = b.budget_cents - b.spent_cents
                  return (
                    <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ background: b.category_color }} />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{b.category_name}</span>
                          {isOver && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Limite excedido</span>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Gasto / Limite</p>
                          <p className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            {formatMoney(b.spent_cents)} / {formatMoney(b.budget_cents)}
                          </p>
                        </div>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: isOver ? '#ef4444' : pct >= 80 ? '#f59e0b' : b.category_color }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>{pct}% utilizado</span>
                        <span className={remaining < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                          {remaining >= 0 ? `Restam ${formatMoney(remaining)}` : `${formatMoney(Math.abs(remaining))} acima do limite`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
