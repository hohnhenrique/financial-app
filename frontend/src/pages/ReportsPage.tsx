import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type ReportFilters, type ReportData } from '@/api/reports'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyValue } from '@/components/ui/MoneyValue'
import { formatMoney, formatDate } from '@/utils/format'

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

type ReportType = 'monthly' | 'category' | 'cashflow'

const REPORT_TYPES = [
  { value: 'monthly',   label: '📅 Extrato mensal',           desc: 'Todas as movimentações do período com totais.' },
  { value: 'category',  label: '🏷️ Agrupado por categoria',   desc: 'Totais de entrada e saída por categoria.' },
  { value: 'cashflow',  label: '💸 Fluxo de caixa',           desc: 'Resumo de receitas, despesas e saldo do período.' },
]

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('monthly')
  const [filters, setFilters]       = useState<ReportFilters>({})
  const [enabled, setEnabled]       = useState(false)

  const { data: allAccounts }   = useQuery({ queryKey: ['accounts-all'],   queryFn: () => accountsApi.listAll().then(r => r.data.data.items) })
  const { data: allCategories } = useQuery({ queryKey: ['categories-all'], queryFn: () => categoriesApi.list().then(r => r.data.data) })

  const catOptions = (allCategories ?? []).map(c => ({ value: String(c.id), label: c.name }))
  const accOptions = (allAccounts   ?? []).map(a => ({ value: String(a.id), label: a.name }))

  const { data: report, isLoading, isFetching } = useQuery({
    queryKey: ['report', reportType, filters],
    queryFn:  () => reportsApi.summary(filters).then(r => r.data.data),
    enabled,
  })

  const setF = (patch: Partial<ReportFilters>) => setFilters(f => ({ ...f, ...patch }))

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    return { value: val, label: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}` }
  })

  const handleGenerate = () => { setEnabled(true) }

  const handlePrint = () => {
    if (!report) return
    const win = window.open('', '_blank')!
    win.document.write(buildPrintHtml(report, reportType))
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  return (
    <div className="space-y-6">

      {/* Seleção de tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <button key={rt.value} onClick={() => { setReportType(rt.value as ReportType); setEnabled(false) }}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              reportType === rt.value
                ? 'border-[#1B4F8A] bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}>
            <p className={`font-semibold text-sm ${reportType === rt.value ? 'text-[#1B4F8A] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{rt.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card title="Filtros do relatório">
        <div className="px-6 pt-5 pb-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <Select label="Mês (atalho)" options={monthOptions} value={filters.year_month ?? ''}
              onChange={e => setF({ year_month: e.target.value, date_from: '', date_to: '' })} placeholder="Período personalizado..." />
            <Input label="Data inicial" type="date" value={filters.date_from ?? ''}
              onChange={e => setF({ date_from: e.target.value, year_month: '' })} />
            <Input label="Data final" type="date" value={filters.date_to ?? ''}
              onChange={e => setF({ date_to: e.target.value, year_month: '' })} />
            <Select label="Tipo" options={[{value:'income',label:'Receitas'},{value:'expense',label:'Despesas'}]}
              value={filters.type ?? ''} onChange={e => setF({ type: e.target.value })} placeholder="Receitas e Despesas" />
            <Select label="Categoria" options={catOptions} value={filters.category_id ?? ''} onChange={e => setF({ category_id: e.target.value })} placeholder="Todas" />
            <Select label="Conta" options={accOptions} value={filters.account_id ?? ''} onChange={e => setF({ account_id: e.target.value })} placeholder="Todas" />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleGenerate} loading={isLoading || isFetching} className="flex-1 sm:flex-none sm:px-8">
              Gerar relatório
            </Button>
            {report && (
              <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Imprimir / PDF
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Resultado */}
      {report && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total de Receitas', value: report.total_income,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Total de Despesas', value: report.total_expense, color: 'text-red-500 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/30' },
              { label: 'Saldo do período',  value: report.balance,       color: report.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-2xl p-5`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{c.label}</p>
                <MoneyValue cents={c.value} className={`text-2xl font-bold mt-1 ${c.color}`} />
              </div>
            ))}
          </div>

          {/* Relatório por tipo */}
          {reportType === 'monthly' && <MonthlyReport data={report} />}
          {reportType === 'category' && <CategoryReport data={report} />}
          {reportType === 'cashflow' && <CashflowReport data={report} />}
        </>
      )}
    </div>
  )
}

// ── Relatório Mensal ──────────────────────────────────────────────────────────
function MonthlyReport({ data }: { data: ReportData }) {
  return (
    <Card title={`Extrato — ${data.count} movimentações`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              {['Data','Descrição','Categoria','Conta','Tipo','Valor'].map((h,i) => (
                <th key={h} className={`px-6 py-3 text-slate-500 dark:text-slate-400 font-medium ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {data.transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{formatDate(tx.transaction_date)}</td>
                <td className="px-6 py-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{tx.description}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tx.category_color }} />
                    <span className="text-slate-500 dark:text-slate-400 text-xs">{tx.category_name ?? '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">{tx.account_name ?? '—'}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                    {tx.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className={`px-6 py-3 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount_cents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
              <td colSpan={5} className="px-6 py-3 text-slate-600 dark:text-slate-300 font-semibold text-sm">Saldo do período</td>
              <td className={`px-6 py-3 text-right font-bold ${data.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {formatMoney(data.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

// ── Relatório por Categoria ───────────────────────────────────────────────────
function CategoryReport({ data }: { data: ReportData }) {
  const expenses = data.by_category.filter(c => c.type === 'expense')
  const incomes  = data.by_category.filter(c => c.type === 'income')

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {[{ label: 'Despesas por Categoria', rows: expenses, color: 'red' }, { label: 'Receitas por Categoria', rows: incomes, color: 'emerald' }].map(group => (
        <Card key={group.label} title={group.label}>
          {group.rows.length === 0
            ? <div className="px-6 py-10 text-center text-slate-400 text-sm">Sem dados.</div>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      {['Categoria','Qtd','Média','Total'].map(h => (
                        <th key={h} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {group.rows.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.category_color }} />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{c.category_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{c.qty}</td>
                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{formatMoney(Math.round(c.avg_amount))}</td>
                        <td className={`px-6 py-3 font-bold ${group.color === 'red' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatMoney(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </Card>
      ))}
    </div>
  )
}

// ── Relatório Fluxo de Caixa ──────────────────────────────────────────────────
function CashflowReport({ data }: { data: ReportData }) {
  // Agrupa por mês
  const byMonth: Record<string, { income: number; expense: number; count: number }> = {}
  data.transactions.forEach(tx => {
    const m = tx.transaction_date.substring(0, 7)
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0, count: 0 }
    if (tx.type === 'income') byMonth[m].income += tx.amount_cents
    else byMonth[m].expense += tx.amount_cents
    byMonth[m].count++
  })

  const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  let accumulated = 0

  return (
    <Card title="Fluxo de Caixa por Mês">
      {months.length === 0
        ? <div className="px-6 py-10 text-center text-slate-400 text-sm">Sem dados no período.</div>
        : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  {['Mês','Movimentações','Receitas','Despesas','Saldo do mês','Acumulado'].map((h,i) => (
                    <th key={h} className={`px-6 py-3 text-slate-500 dark:text-slate-400 font-medium ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {months.map(([month, vals]) => {
                  const saldo = vals.income - vals.expense
                  accumulated += saldo
                  const [y, m] = month.split('-')
                  return (
                    <tr key={month} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {MONTHS_PT[parseInt(m)-1]} {y}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{vals.count}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatMoney(vals.income)}</td>
                      <td className="px-6 py-4 text-right text-red-500 dark:text-red-400 font-semibold">{formatMoney(vals.expense)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {saldo >= 0 ? '+' : ''}{formatMoney(saldo)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${accumulated >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                        {formatMoney(accumulated)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      }
    </Card>
  )
}

// ── Geração de HTML para impressão ────────────────────────────────────────────
function buildPrintHtml(data: ReportData, type: ReportType): string {
  const now = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })

  const header = `
    <div style="margin-bottom:24px; border-bottom:2px solid #1B4F8A; padding-bottom:16px;">
      <h1 style="color:#1B4F8A; margin:0; font-size:22px;">Finance App — Relatório</h1>
      <p style="color:#666; margin:4px 0 0; font-size:12px;">Gerado em ${now}</p>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px;">
      ${[
        ['Receitas', formatMoney(data.total_income),  '#059669'],
        ['Despesas', formatMoney(data.total_expense), '#dc2626'],
        ['Saldo',    formatMoney(data.balance),        data.balance >= 0 ? '#2563eb' : '#dc2626'],
      ].map(([l,v,c]) => `
        <div style="background:#f8fafc; border-radius:8px; padding:12px; text-align:center;">
          <p style="font-size:10px; color:#64748b; margin:0 0 4px; text-transform:uppercase; letter-spacing:.05em;">${l}</p>
          <p style="font-size:18px; font-weight:700; color:${c}; margin:0;">${v}</p>
        </div>
      `).join('')}
    </div>
  `

  let body = ''

  if (type === 'monthly') {
    body = `
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#1B4F8A; color:white;">
            ${['Data','Descrição','Categoria','Conta','Tipo','Valor'].map(h => `<th style="padding:8px 10px; text-align:left;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.transactions.map((tx, i) => `
            <tr style="background:${i%2===0?'#ffffff':'#f8fafc'};">
              <td style="padding:7px 10px; color:#64748b;">${formatDate(tx.transaction_date)}</td>
              <td style="padding:7px 10px; font-weight:500;">${tx.description}</td>
              <td style="padding:7px 10px; color:#64748b;">${tx.category_name ?? '—'}</td>
              <td style="padding:7px 10px; color:#64748b;">${tx.account_name ?? '—'}</td>
              <td style="padding:7px 10px;"><span style="background:${tx.type==='income'?'#d1fae5':'#fee2e2'}; color:${tx.type==='income'?'#065f46':'#991b1b'}; padding:2px 8px; border-radius:999px; font-size:10px;">${tx.type==='income'?'Receita':'Despesa'}</span></td>
              <td style="padding:7px 10px; text-align:right; font-weight:600; color:${tx.type==='income'?'#059669':'#dc2626'};">${tx.type==='income'?'+':'-'}${formatMoney(tx.amount_cents)}</td>
            </tr>
          `).join('')}
          <tr style="background:#1B4F8A; color:white; font-weight:700;">
            <td colspan="5" style="padding:8px 10px;">Saldo do período</td>
            <td style="padding:8px 10px; text-align:right;">${formatMoney(data.balance)}</td>
          </tr>
        </tbody>
      </table>
    `
  } else if (type === 'category') {
    const expenses = data.by_category.filter(c => c.type === 'expense')
    const incomes  = data.by_category.filter(c => c.type === 'income')
    const table = (rows: typeof expenses, color: string) => `
      <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:16px;">
        <thead><tr style="background:${color}; color:white;">
          ${['Categoria','Qtd','Menor','Maior','Média','Total'].map(h=>`<th style="padding:8px 10px; text-align:left;">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${rows.map((c,i)=>`
            <tr style="background:${i%2===0?'#ffffff':'#f8fafc'};">
              <td style="padding:7px 10px; font-weight:500;">${c.category_name??'—'}</td>
              <td style="padding:7px 10px;">${c.qty}</td>
              <td style="padding:7px 10px;">${formatMoney(c.min_amount)}</td>
              <td style="padding:7px 10px;">${formatMoney(c.max_amount)}</td>
              <td style="padding:7px 10px;">${formatMoney(Math.round(c.avg_amount))}</td>
              <td style="padding:7px 10px; font-weight:700; text-align:right;">${formatMoney(c.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    body = `<h3 style="color:#dc2626; margin:0 0 8px;">Despesas</h3>${table(expenses,'#dc2626')}<h3 style="color:#059669; margin:16px 0 8px;">Receitas</h3>${table(incomes,'#059669')}`
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Finance App</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;} @media print{body{padding:16px;}}</style>
    </head><body>
    ${header}
    ${body}
    <p style="text-align:center; color:#94a3b8; font-size:10px; margin-top:24px; border-top:1px solid #e2e8f0; padding-top:12px;">
      Finance App — ${now}
    </p>
    </body></html>`
}
