import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi } from '@/api/goals'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { formatMoney } from '@/utils/format'

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTHS_PT[parseInt(m)-1]} ${y}`
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  const isOver = value > max && max > 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
        <span>{formatMoney(value)} de {formatMoney(max)}</span>
        <span className={isOver ? 'text-red-500 font-semibold' : ''}>{pct}%{isOver ? ' ⚠️' : ''}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: isOver ? '#ef4444' : color }}
        />
      </div>
    </div>
  )
}

export function GoalsPage() {
  const qc = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth())
  const [incomeGoal, setIncomeGoal]   = useState('')
  const [expenseGoal, setExpenseGoal] = useState('')
  const [notes, setNotes]             = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  const { data: status, isLoading } = useQuery({
    queryKey: ['goal-status', selectedMonth],
    queryFn:  () => goalsApi.forMonth(selectedMonth).then(r => r.data.data),
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn:  () => goalsApi.list().then(r => r.data.data),
  })

  // Preenche formulário ao mudar de mês
  const loadGoal = (ym: string) => {
    setSelectedMonth(ym)
    setIncomeGoal('')
    setExpenseGoal('')
    setNotes('')
  }

  const saveMut = useMutation({
    mutationFn: () => goalsApi.upsert({
      year_month:   selectedMonth,
      income_goal:  incomeGoal  || '0',
      expense_goal: expenseGoal || '0',
      notes,
    }),
    onSuccess: () => {
      setSuccess('Meta salva com sucesso!')
      setError('')
      qc.invalidateQueries({ queryKey: ['goal-status', selectedMonth] })
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
    onError: () => setError('Erro ao salvar a meta.'),
  })

  const deleteMut = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['goal-status', selectedMonth] })
    },
  })

  // Gera options dos últimos 12 e próximos 3 meses
  const monthOptions = Array.from({ length: 15 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 12 + i)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    return { value: val, label: monthLabel(val) }
  })

  const projBalance = (status?.income_goal ?? 0) - (status?.expense_goal ?? 0)
  const realBalance = (status?.real_income ?? 0) - (status?.real_expense ?? 0)
  const hasGoal     = !!status?.goal

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">

      {/* Formulário */}
      <div className="space-y-5">
        <Card title="Meta Mensal" subtitle="Defina sua meta de receita e despesa para o mês.">
          <div className="px-6 pb-6 space-y-5">
            {error   && <Alert type="error"   message={error} />}
            {success && <Alert type="success" message={success} />}

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Mês *</label>
              <select
                value={selectedMonth}
                onChange={e => loadGoal(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              >
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <Input
              label="Meta de receita"
              prefix="R$"
              value={incomeGoal}
              onChange={e => setIncomeGoal(e.target.value)}
              placeholder={hasGoal ? formatMoney(status!.income_goal).replace('R$ ','') : '0,00'}
            />

            <Input
              label="Meta de despesa (limite)"
              prefix="R$"
              value={expenseGoal}
              onChange={e => setExpenseGoal(e.target.value)}
              placeholder={hasGoal ? formatMoney(status!.expense_goal).replace('R$ ','') : '0,00'}
            />

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Observações <span className="font-normal text-xs text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: Mês de férias, controlar gastos extras..."
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
              />
            </div>

            {/* Preview do saldo projetado */}
            {(incomeGoal || expenseGoal) && (
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-sm space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Prévia</p>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Receita prevista:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {incomeGoal ? formatMoney(Math.round(parseFloat(incomeGoal.replace(',','.')) * 100)) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Limite de despesa:</span>
                  <span className="text-red-500 dark:text-red-400 font-semibold">
                    {expenseGoal ? formatMoney(Math.round(parseFloat(expenseGoal.replace(',','.')) * 100)) : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Saldo previsto:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {incomeGoal || expenseGoal
                      ? formatMoney(
                          Math.round(parseFloat((incomeGoal || '0').replace(',','.')) * 100) -
                          Math.round(parseFloat((expenseGoal || '0').replace(',','.')) * 100)
                        )
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} className="w-full">
              {hasGoal ? 'Atualizar meta' : 'Salvar meta'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Status do mês selecionado + lista */}
      <div className="space-y-5">

        {/* Status atual */}
        <Card title={`Posição — ${monthLabel(selectedMonth)}`}>
          <div className="px-6 pb-6 space-y-5">
            {isLoading
              ? <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-4 border-[#1B4F8A] border-t-transparent rounded-full" /></div>
              : !hasGoal
                ? <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma meta definida para {monthLabel(selectedMonth)}.</div>
                : <>
                    {/* Cards resumo */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Saldo projetado', value: projBalance, color: projBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
                        { label: 'Saldo real',      value: realBalance, color: realBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
                      ].map(c => (
                        <div key={c.label} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
                          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{c.label}</p>
                          <MoneyValue cents={c.value} className={`text-lg font-bold ${c.color}`} />
                        </div>
                      ))}
                    </div>

                    {/* Barras de progresso */}
                    <div className="space-y-4">
                      {status!.income_goal > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Receitas</p>
                          <ProgressBar value={status!.real_income} max={status!.income_goal} color="#34d399" />
                        </div>
                      )}
                      {status!.expense_goal > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Despesas</p>
                          <ProgressBar value={status!.real_expense} max={status!.expense_goal} color="#f87171" />
                        </div>
                      )}
                    </div>

                    {/* Alertas */}
                    {status!.expense_pct !== null && status!.expense_pct >= 80 && (
                      <Alert type="warning" message={`Você já usou ${status!.expense_pct}% do limite de despesas do mês.`} />
                    )}
                    {status!.expense_pct !== null && status!.expense_pct >= 100 && (
                      <Alert type="error" message="Limite de despesas atingido! Você está acima da meta." />
                    )}
                    {status!.income_pct !== null && status!.income_pct >= 100 && (
                      <Alert type="success" message="Meta de receita atingida! 🎉" />
                    )}
                  </>
            }
          </div>
        </Card>

        {/* Lista de metas cadastradas */}
        <Card title="Metas cadastradas">
          {(goals ?? []).length === 0
            ? <div className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma meta cadastrada ainda.</div>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      {['Mês','Meta receita','Limite despesa','Saldo previsto',''].map(h => (
                        <th key={h} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {(goals ?? []).map(g => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                          <button onClick={() => loadGoal(g.year_month)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {monthLabel(g.year_month)}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <MoneyValue cents={g.income_goal} />
                        </td>
                        <td className="px-6 py-4 text-red-500 dark:text-red-400 font-semibold">
                          <MoneyValue cents={g.expense_goal} />
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          <MoneyValue
                            cents={g.income_goal - g.expense_goal}
                            className={g.income_goal - g.expense_goal >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => confirm('Excluir esta meta?') && deleteMut.mutate(g.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </Card>
      </div>
    </div>
  )
}
