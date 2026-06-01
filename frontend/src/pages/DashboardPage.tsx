import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Card } from '@/components/ui/Card'
import { formatMoney, formatDate } from '@/utils/format'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid, ReferenceLine, LabelList, AreaChart, Area,
} from 'recharts'
import { useTheme } from '@/context/ThemeContext'
import { Link } from 'react-router-dom'
import { MoneyValue } from '@/components/ui/MoneyValue'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

type ViewType = 'all' | 'income' | 'expense' | 'balance'

// Label customizado que aparece acima do ponto
const BalanceLabel = ({ x, y, value }: { x?: number; y?: number; value?: number }) => {
  if (value === undefined || x === undefined || y === undefined) return null
  const isNeg = value < 0
  return (
    <text
      x={x} y={y - 10}
      fill={isNeg ? '#f87171' : '#34d399'}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {value >= 0 ? '+' : ''}
      {value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </text>
  )
}

// Tooltip customizado dark-aware
function ChartTooltip({ active, payload, label, dark }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; dark: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className={`rounded-xl shadow-lg px-4 py-3 text-sm border ${dark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
      <p className="font-semibold mb-2 text-xs uppercase tracking-wide opacity-60">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="opacity-70">{p.name}:</span>
          <span className="font-bold">{formatMoney(Math.round(p.value * 100))}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { dark } = useTheme()
  const [month, setMonth] = useState(currentYearMonth())
  const [view, setView] = useState<ViewType>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => dashboardApi.get(month).then(r => r.data.data),
  })

  const tickColor  = dark ? '#94a3b8' : '#64748b'
  const gridColor  = dark ? 'rgba(148,163,184,.08)' : 'rgba(0,0,0,.05)'
  const tooltipBg  = dark ? '#1e293b' : '#ffffff'
  const tooltipBdr = dark ? '#334155' : '#e2e8f0'

  const income  = data?.summary.total_income  ?? 0
  const expense = data?.summary.total_expense ?? 0
  const balance = income - expense
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0

  const monthName = MONTHS[parseInt(month.split('-')[1]) - 1]

  const cards: Record<ViewType, { label: string; value: number; color: string; bg: string; icon: string }[]> = {
    all: [
      { label: `Receitas — ${monthName}`, value: income,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: 'M7 11l5-5m0 0l5 5m-5-5v12' },
      { label: `Despesas — ${monthName}`, value: expense, color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/30',          icon: 'M17 13l-5 5m0 0l-5-5m5 5V6' },
      { label: 'Saldo do mês',            value: balance, color: balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
    income:  [{ label: 'Receitas',  value: income,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: 'M7 11l5-5m0 0l5 5m-5-5v12' }],
    expense: [{ label: 'Despesas',  value: expense, color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/30',          icon: 'M17 13l-5 5m0 0l-5-5m5 5V6' }],
    balance: [{ label: 'Saldo',     value: balance, color: balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }],
  }

  // Últimos 12 meses, ordenados do mais antigo para o mais novo
  const chartData = [...(data?.chart_months ?? [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map(m => ({
      label:    m.label,
      Receitas: +(m.income / 100).toFixed(2),
      Despesas: +(m.expense / 100).toFixed(2),
      Saldo:    +(m.balance / 100).toFixed(2),
    }))

  const pieData = (data?.expenses_by_category ?? []).map(c => ({
    name: c.name, value: +(c.total / 100).toFixed(2), color: c.color,
  }))

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${MONTHS[parseInt(m)-1]}/${y.slice(2)}`
  }

  // Acúmulo do saldo (patrimônio acumulado)
  let accumulated = 0
  const accData = chartData.map(m => {
    accumulated += m.Saldo
    return { label: m.label, Acumulado: +accumulated.toFixed(2) }
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#1B4F8A] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-3 shadow-sm">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - i)
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
            return <option key={val} value={val}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>
          })}
        </select>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-600" />

        {(['all','income','expense','balance'] as ViewType[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              view === v
                ? 'bg-[#1B4F8A] text-white border-[#1B4F8A] shadow-sm'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            {{ all: 'Geral', income: 'Receitas', expense: 'Despesas', balance: 'Saldo' }[v]}
          </button>
        ))}

        {/* Taxa de poupança */}
        {income > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-slate-400 dark:text-slate-500">Taxa de poupança:</span>
            <span className={`font-bold ${savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {savingsRate}%
            </span>
          </div>
        )}
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────────── */}
      {(() => {
        const colsClass: Record<number, string> = {
          1: 'md:grid-cols-1',
          2: 'md:grid-cols-2',
          3: 'md:grid-cols-3',
        }
        return (
            <div className={`grid grid-cols-1 ${colsClass[cards[view].length] ?? 'md:grid-cols-3'} gap-5`}>
              {cards[view].map(c => (
                  <div key={c.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <svg className={`w-7 h-7 ${c.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
                      <MoneyValue cents={c.value} className={`text-2xl font-bold mt-1 ${c.color}`} />
                    </div>
                  </div>
              ))}
            </div>
        )
      })()}

      {/* ── Receitas vs Despesas + Categorias ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card
            title="Receitas vs Despesas"
            subtitle="Últimos 12 meses"
            className="xl:col-span-2"
        >
          <div className="px-6 pb-6 flex items-center justify-center min-h-[280px]">
            {chartData.length === 0 ? (
                <div className="text-slate-400 text-sm">
                  Sem dados suficientes.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                      data={chartData}
                      barGap={3}
                      barCategoryGap="30%"
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: tickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: tickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `R$${v}`}
                        width={70}
                    />
                    <Tooltip content={<ChartTooltip dark={dark} />} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          fontSize: 12,
                          color: tickColor,
                          paddingTop: 8,
                        }}
                    />
                    <Bar
                        dataKey="Receitas"
                        fill="#34d399"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={32}
                    />
                    <Bar
                        dataKey="Despesas"
                        fill="#f87171"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Por Categoria" subtitle={`Despesas — ${monthName}`}>
          <div className="px-4 pb-6">
            {pieData.length === 0
              ? <div className="flex items-center justify-center h-52 text-slate-400 text-sm">Sem despesas no mês.</div>
              : <>
                  {/* Pizza — limita legenda a 5 e centraliza */}
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                          data={pieData.slice(0, 5)}   // ← máximo 5 categorias
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={80}
                          innerRadius={52}
                          paddingAngle={2}
                      >
                        {pieData.slice(0, 5).map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(Math.round(Number(v) * 100))}
                               contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 12 }} />
                      <Legend iconSize={10} iconType="circle"
                              wrapperStyle={{ fontSize: 11, color: tickColor, paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/*<div className="space-y-2 px-2">*/}
                  {/*  {pieData.slice(0, 0).map((c, i) => {*/}
                  {/*    const pct = expense > 0 ? Math.round((c.value / (expense / 100)) * 100) : 0*/}
                  {/*    return (*/}
                  {/*      <div key={i}>*/}
                  {/*        <div className="flex justify-between text-xs mb-1">*/}
                  {/*          <div className="flex items-center gap-1.5">*/}
                  {/*            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />*/}
                  {/*            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>*/}
                  {/*          </div>*/}
                  {/*          <span className="text-slate-400 dark:text-slate-500 font-medium tabular-nums">{pct}%</span>*/}
                  {/*        </div>*/}
                  {/*        <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">*/}
                  {/*          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />*/}
                  {/*        </div>*/}
                  {/*      </div>*/}
                  {/*    )*/}
                  {/*  })}*/}
                  {/*</div>*/}
                </>
            }
          </div>
        </Card>
      </div>

      {/* ── Evolução do Saldo + Patrimônio acumulado ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Gráfico de linha: saldo por mês com label acima do ponto */}
        <Card title="Evolução do Saldo" subtitle="Resultado líquido mês a mês — últimos 12 meses">
          <div className="px-6 pb-6">
            {chartData.length === 0
              ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados.</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={70} />
                    <ReferenceLine y={0} stroke={dark ? '#475569' : '#cbd5e1'} strokeDasharray="4 3" />
                    <Tooltip content={<ChartTooltip dark={dark} />} />
                    <Line
                      type="monotone"
                      dataKey="Saldo"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList dataKey="Saldo" content={<BalanceLabel />} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>
        </Card>

        {/* Área: patrimônio acumulado */}
        <Card title="Patrimônio Acumulado" subtitle="Saldo acumulado ao longo do tempo">
          <div className="px-6 pb-6">
            {accData.length === 0
              ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados.</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={accData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={70} />
                    <ReferenceLine y={0} stroke={dark ? '#475569' : '#cbd5e1'} strokeDasharray="4 3" />
                    <Tooltip content={<ChartTooltip dark={dark} />} />
                    <Area type="monotone" dataKey="Acumulado" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradAcc)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
        </Card>
      </div>

      {/* ── Análise de fluxo de caixa ──────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card title="Fluxo de Caixa" subtitle="Comparativo mês a mês — receita, despesa e saldo líquido">
          <div className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={2} barCategoryGap="25%">
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={70} />
                <ReferenceLine y={0} stroke={dark ? '#475569' : '#cbd5e1'} />
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: tickColor }} />
                <Bar dataKey="Receitas" fill="#34d399" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="Despesas" fill="#f87171" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="Saldo"    fill="#60a5fa" radius={[4,4,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Comparativo mês anterior */}
      {data?.previous_summary && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Comparativo com mês anterior</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{monthLabel(data.previous_month)} vs {monthLabel(month)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Receitas',
                  current: income,
                  prev: data.previous_summary.total_income,
                  positiveIsGood: true,
                },
                {
                  label: 'Despesas',
                  current: expense,
                  prev: data.previous_summary.total_expense,
                  positiveIsGood: false,
                },
                {
                  label: 'Saldo',
                  current: balance,
                  prev: data.previous_summary.total_income - data.previous_summary.total_expense,
                  positiveIsGood: true,
                },
              ].map(c => {
                const diff    = c.current - c.prev
                const pct     = c.prev > 0 ? Math.round((diff / c.prev) * 100) : null
                const isGood  = c.positiveIsGood ? diff >= 0 : diff <= 0
                const diffColor = diff === 0 ? 'text-slate-400' : isGood ? 'text-emerald-500' : 'text-red-500'
                return (
                    <div key={c.label} className="text-center">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{c.label}</p>
                      <MoneyValue cents={c.current} className="text-sm font-bold text-slate-700 dark:text-slate-200" />
                      {pct !== null && (
                          <p className={`text-xs font-semibold mt-0.5 ${diffColor}`}>
                            {diff >= 0 ? '+' : ''}{pct}%
                          </p>
                      )}
                    </div>
                )
              })}
            </div>
          </div>
      )}

      {/* ── Últimas movimentações ──────────────────────────────────────────── */}
      <Card
        title="Últimas Movimentações"
        action={<Link to="/transactions" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">Ver todas →</Link>}
      >
        {(data?.recent_transactions ?? []).length === 0
          ? <div className="px-6 py-12 text-center text-slate-400 text-sm">Nenhuma movimentação ainda.</div>
          : <div className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {(data?.recent_transactions ?? []).map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                      <svg className={`w-5 h-5 ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'income' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{tx.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tx.category_name ?? '—'} · {tx.account_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount_cents)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.transaction_date)}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>

    </div>
  )
}
