import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { importApi, type ImportedRow } from '@/api/import'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { formatMoney, formatDate } from '@/utils/format'
import { useToast } from '@/context/ToastContext'

const BANKS = [
  { value: 'rico',     label: '💳 Rico — Cartão de Crédito' },
  { value: 'inter',    label: '🟠 Banco Inter — Conta Corrente' },
  { value: 'nubank',   label: '💜 Nubank — Cartão / Conta' },
  { value: 'itau',     label: '🟡 Itaú — Conta Corrente' },
  { value: 'bradesco', label: '🔴 Bradesco — Conta Corrente' },
  { value: 'generic',  label: '📄 Genérico (CSV padrão)' },
]

const BANK_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  rico:     { title: '💳 Rico — Cartão de Crédito',  steps: ['Acesse o app ou site da Rico', 'Vá em Cartão → Fatura', 'Clique em "Exportar" → CSV'] },
  inter:    { title: '🟠 Banco Inter',               steps: ['App Inter → Extrato → Período', 'Toque em "Exportar" → Escolha CSV', 'O arquivo vem com nome tipo Extrato-DD-MM-AAAA...CSV.csv'] },
  nubank:   { title: '💜 Nubank',                    steps: ['App → Perfil → Meus dados', '"Exportar dados" → Transações CSV'] },
  itau:     { title: '🟡 Itaú',                      steps: ['Internet Banking → Conta → Extrato', 'Clique em "Exportar" → CSV'] },
  bradesco: { title: '🔴 Bradesco',                  steps: ['Internet Banking → Extrato', '"Exportar" → CSV'] },
  generic:  { title: '📄 Formato genérico',          steps: ['Colunas: Data (DD/MM/AAAA), Descrição, Valor', 'Separador: ponto-e-vírgula ou vírgula', 'Negativos = despesa, positivos = receita'] },
}

type Step = 'upload' | 'review' | 'done'

/** Converte "2025-12-03" → "03/12/2025" */
function isoToBR(iso: string): string {
  if (!iso || !iso.includes('-')) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const toast   = useToast()

  const [step,             setStep]             = useState<Step>('upload')
  const [bank,             setBank]             = useState('rico')
  const [defaultAccountId, setDefaultAccountId] = useState('')
  const [globalDate,       setGlobalDate]       = useState('')
  const [fileName,         setFileName]         = useState('')
  const [rows,             setRows]             = useState<ImportedRow[]>([])
  const [result,           setResult]           = useState<{ imported: number } | null>(null)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')

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

  const accOptions = (accountsData?.items ?? []).map(a => ({ value: String(a.id), label: a.name }))
  const catOptions = (categories ?? []).filter(c => !c.is_archived).map(c => ({ value: String(c.id), label: c.name }))

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file)             { setError('Selecione um arquivo CSV.'); return }
    if (!defaultAccountId) { setError('Selecione uma conta padrão.'); return }

    setError(''); setLoading(true)
    try {
      const res  = await importApi.preview(file, bank)
      const data = res.data.data

      if (data.total === 0) { setError('Nenhuma transação encontrada no arquivo.'); return }

      setRows(data.transactions.map(t => {
        const csvDate  = t.date            // data original do CSV (ISO)
        const saveDate = globalDate || t.date  // data que será salva

        // Descrição final: "MP*MERCADOLIVRE [7 de 10] - 03/12/2025"
        // Usa sempre a data original do CSV para a concatenação
        const description = `${t.description} - ${isoToBR(csvDate)}`

        return {
          date:              saveDate,
          original_date:     csvDate,
          description,
          amount_cents:      t.amount_cents,
          type:              t.type,
          original_category: t.original_category,
          selected:          true,
          account_id:        defaultAccountId,
          category_id:       '',
        }
      }))

      setStep('review')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao processar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const missing = rows.filter(r => r.selected && !r.category_id)
    if (missing.length > 0) {
      setError(`${missing.length} movimentação(ões) sem categoria. Selecione ou desmarque.`)
      return
    }

    setLoading(true); setError('')
    try {
      const res = await importApi.confirm(rows)
      setResult(res.data.data)
      setStep('done')
      toast.success(`${res.data.data.imported} movimentações importadas com sucesso!`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao importar.')
    } finally {
      setLoading(false)
    }
  }

  const update      = (i: number, patch: Partial<ImportedRow>) =>
    setRows(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const selectAll   = () => setRows(p => p.map(r => ({ ...r, selected: true })))
  const deselectAll = () => setRows(p => p.map(r => ({ ...r, selected: false })))
  const setCatAll   = (catId: string) => setRows(p => p.map(r => ({ ...r, category_id: catId })))

  const selected     = rows.filter(r => r.selected)
  const missing      = selected.filter(r => !r.category_id).length
  const totalExpense = selected.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount_cents, 0)
  const totalIncome  = selected.filter(r => r.type === 'income').reduce((s, r) => s + r.amount_cents, 0)

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: upload
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card title="Importar Extrato" subtitle="Importe transações do seu banco em formato CSV." padding>
        <div className="space-y-5">
          {error && <Alert type="error" message={error} />}

          <Select
            label="Banco / Corretora"
            options={BANKS}
            value={bank}
            onChange={e => { setBank(e.target.value); setError('') }}
            required
          />

          <Select
            label="Conta padrão"
            options={accOptions}
            value={defaultAccountId}
            onChange={e => setDefaultAccountId(e.target.value)}
            placeholder={accOptions.length === 0 ? 'Carregando contas...' : 'Selecione a conta de destino...'}
            required
          />

          {/* Data global — opcional */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Data única{' '}
              <span className="text-xs font-normal text-slate-400">
                (opcional — se preenchida, todas as movimentações são salvas com essa data)
              </span>
            </label>
            <input
              type="date"
              value={globalDate}
              onChange={e => setGlobalDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl
                         bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            {globalDate && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span>⚠️ Todas as movimentações serão salvas com a data {formatDate(globalDate)}. A data original do CSV aparecerá na descrição.</span>
                <button onClick={() => setGlobalDate('')} className="underline hover:no-underline ml-1 flex-shrink-0">
                  Remover
                </button>
              </p>
            )}
          </div>

          {/* Arquivo */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Arquivo CSV *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
            >
              <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {fileName
                ? <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{fileName}</p>
                : <>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Clique para selecionar <span className="text-blue-600 dark:text-blue-400 font-medium">.csv</span> ou <span className="text-blue-600 dark:text-blue-400 font-medium">.txt</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Máximo 5MB</p>
                  </>
              }
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.ofx"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setFileName(f.name)
                }}
              />
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {BANK_INSTRUCTIONS[bank].title}
            </p>
            <ol className="list-decimal list-inside space-y-1">
              {BANK_INSTRUCTIONS[bank].steps.map((s, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400">{s}</li>
              ))}
            </ol>
          </div>

          <Button onClick={handleUpload} loading={loading} className="w-full" size="lg">
            Analisar arquivo →
          </Button>
        </div>
      </Card>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: review
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Revisar movimentações</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selected.length}</span> selecionadas
            {missing > 0 && <> · <span className="text-amber-500 font-semibold">{missing} sem categoria</span></>}
            {' '}· {rows.length - selected.length} ignoradas
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>← Voltar</Button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Ações em massa */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 px-5 py-3 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={selectAll}
            className="font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Selecionar todas
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={deselectAll} className="text-slate-500 dark:text-slate-400 hover:underline">
            Desmarcar todas
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600" />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Categoria para todas:</span>
          <select
            onChange={e => { if (e.target.value) setCatAll(e.target.value) }}
            defaultValue=""
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">Aplicar a todas...</option>
            {catOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-700/90 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === rows.length && rows.length > 0}
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-36">
                  Data salva
                </th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">
                  Descrição
                  <span className="ml-1 text-[10px] font-normal text-slate-400">(editável)</span>
                </th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-28">Tipo</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-right w-28">Valor</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-40">Conta</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-40">
                  Categoria <span className="text-red-400">*</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    !row.selected
                      ? 'opacity-40 bg-slate-50/50 dark:bg-slate-700/20'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-2.5" onClick={() => update(i, { selected: !row.selected })}>
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => update(i, { selected: !row.selected })}
                      onClick={e => e.stopPropagation()}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Data — editável */}
                  <td className="px-4 py-2.5">
                    <input
                      type="date"
                      value={row.date}
                      onChange={e => update(i, { date: e.target.value })}
                      disabled={!row.selected}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg
                                 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs
                                 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                  </td>

                  {/* Descrição — input editável pré-preenchido com data concatenada */}
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => update(i, { description: e.target.value })}
                      disabled={!row.selected}
                      title={row.description}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg
                                 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs
                                 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50
                                 min-w-[200px]"
                    />
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => update(i, { type: row.type === 'income' ? 'expense' : 'income' })}
                      title="Clique para inverter"
                      disabled={!row.selected}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                        row.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                      }`}
                    >
                      {row.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  </td>

                  {/* Valor */}
                  <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap text-xs ${
                    row.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {row.type === 'income' ? '+' : '-'}{formatMoney(row.amount_cents)}
                  </td>

                  {/* Conta */}
                  <td className="px-4 py-2.5">
                    <select
                      value={row.account_id}
                      onChange={e => update(i, { account_id: e.target.value })}
                      disabled={!row.selected}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg
                                 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs
                                 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      {accOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-2.5">
                    <select
                      value={row.category_id}
                      onChange={e => update(i, { category_id: e.target.value })}
                      disabled={!row.selected}
                      className={`w-full px-2 py-1.5 border rounded-lg bg-white dark:bg-slate-700
                                  text-slate-700 dark:text-slate-200 text-xs
                                  focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 ${
                        row.selected && !row.category_id
                          ? 'border-amber-400 dark:border-amber-500'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <option value="">Selecione...</option>
                      {catOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé — totais + botão */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          {missing > 0 && (
            <p className="text-amber-500 dark:text-amber-400 text-xs font-medium mb-3">
              ⚠️ {missing} movimentação(ões) sem categoria — selecione ou desmarque.
            </p>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Totais */}
            <div className="flex items-center gap-5">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Despesas</p>
                <p className="font-bold text-red-500 dark:text-red-400 text-base leading-tight">
                  {formatMoney(totalExpense)}
                </p>
              </div>

              {totalIncome > 0 && (
                <>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-600" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Receitas</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base leading-tight">
                      {formatMoney(totalIncome)}
                    </p>
                  </div>
                </>
              )}

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-600" />

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.length} de {rows.length} selecionadas
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              loading={loading}
              disabled={selected.length === 0 || missing > 0}
              size="lg"
            >
              Importar {selected.length} movimentações
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: done
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <Card padding>
        <div className="py-6 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Importação concluída!</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{result?.imported}</span> movimentações importadas com sucesso.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setStep('upload')
                setRows([])
                setResult(null)
                setFileName('')
                setGlobalDate('')
              }}
              className="flex-1"
            >
              Nova importação
            </Button>
            <Button onClick={() => window.location.href = '/transactions'} className="flex-1">
              Ver movimentações
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
