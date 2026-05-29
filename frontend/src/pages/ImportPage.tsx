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

const BANKS = [
  { value: 'rico',     label: '💳 Rico — Cartão de Crédito' },
  { value: 'inter',    label: '🟠 Banco Inter — Conta / Cartão' },
  { value: 'nubank',   label: '💜 Nubank — Cartão / Conta' },
  { value: 'itau',     label: '🟡 Itaú — Conta Corrente' },
  { value: 'bradesco', label: '🔴 Bradesco — Conta Corrente' },
  { value: 'generic',  label: '📄 Genérico (CSV padrão)' },
]

const BANK_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  rico:     { title: '💳 Rico — Cartão de Crédito', steps: ['Acesse o app ou site da Rico', 'Vá em Cartão → Fatura', 'Clique em "Exportar" → CSV'] },
  inter:    { title: '🟠 Banco Inter', steps: ['App Inter → Extrato → Período', 'Toque em "Exportar" → CSV', 'Ou: Internet Banking → Conta → Extrato → Exportar'] },
  nubank:   { title: '💜 Nubank', steps: ['App → Perfil → Meus dados', '"Exportar dados" → Transações CSV'] },
  itau:     { title: '🟡 Itaú', steps: ['Internet Banking → Conta → Extrato', 'Clique em "Exportar" → CSV'] },
  bradesco: { title: '🔴 Bradesco', steps: ['Internet Banking → Extrato', '"Exportar" → CSV'] },
  generic:  { title: '📄 Formato genérico', steps: ['Colunas: Data (DD/MM/AAAA), Descrição, Valor', 'Separador: ponto-e-vírgula ou vírgula', 'Valores negativos = despesa, positivos = receita'] },
}

type Step = 'upload' | 'review' | 'done'

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep]               = useState<Step>('upload')
  const [bank, setBank]               = useState('rico')
  const [defaultAccountId, setDefaultAccountId] = useState('')
  const [rows, setRows]               = useState<ImportedRow[]>([])
  const [result, setResult]           = useState<{ imported: number } | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [fileName, setFileName]       = useState('')

  // ── Busca contas e categorias ─────────────────────────────────────────────
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-all'],
    queryFn:  () => accountsApi.listAll().then(r => r.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn:  () => categoriesApi.list().then(r => r.data.data),
  })

  // listAll retorna { items: Account[], total, ... }
  const accounts   = accountsData?.items ?? []
  const accOptions = accounts.map(a => ({ value: String(a.id), label: a.name }))
  const catOptions = (categories ?? [])
    .filter(c => !c.is_archived)
    .map(c => ({ value: String(c.id), label: c.name }))

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

      setRows(data.transactions.map(t => ({
        ...t,
        selected:    true,
        account_id:  defaultAccountId,
        category_id: '',
      })))
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
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao importar.')
    } finally {
      setLoading(false)
    }
  }

  const update     = (i: number, patch: Partial<ImportedRow>) => setRows(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const selectAll  = () => setRows(p => p.map(r => ({ ...r, selected: true  })))
  const deselectAll= () => setRows(p => p.map(r => ({ ...r, selected: false })))
  const setCatAll  = (catId: string) => setRows(p => p.map(r => ({ ...r, category_id: catId })))

  const selected = rows.filter(r => r.selected)
  const missing  = selected.filter(r => !r.category_id).length

  const instructions = BANK_INSTRUCTIONS[bank]

  // ── Step: upload ──────────────────────────────────────────────────────────
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

          {/* Área de upload */}
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

          {/* Instruções do banco */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{instructions.title}</p>
            <ol className="list-decimal list-inside space-y-1">
              {instructions.steps.map((step, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400">{step}</li>
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

  // ── Step: review ──────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Revisar movimentações</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selected.length}</span> selecionadas
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
          <button onClick={selectAll}    className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Selecionar todas</button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button onClick={deselectAll}  className="text-slate-500 dark:text-slate-400 hover:underline">Desmarcar todas</button>
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
        <div className="overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-700/90 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={selected.length === rows.length && rows.length > 0}
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left whitespace-nowrap">Data</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Descrição</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Tipo</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-right">Valor</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-40">Conta</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-left w-40">
                  Categoria <span className="text-red-400">*</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {rows.map((row, i) => (
                <tr key={i} className={`transition-colors ${!row.selected ? 'opacity-40 bg-slate-50/50 dark:bg-slate-700/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'}`}>
                  <td className="px-4 py-3" onClick={() => update(i, { selected: !row.selected })}>
                    <input type="checkbox" checked={row.selected}
                      onChange={() => update(i, { selected: !row.selected })}
                      onClick={e => e.stopPropagation()}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[180px]">
                    <span className="truncate block" title={row.description}>{row.description}</span>
                    {row.original_category && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{row.original_category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update(i, { type: row.type === 'income' ? 'expense' : 'income' })}
                      title="Clique para inverter"
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        row.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                      }`}
                    >
                      {row.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                    row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  }`}>
                    {row.type === 'income' ? '+' : '-'}{formatMoney(row.amount_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.account_id}
                      onChange={e => update(i, { account_id: e.target.value })}
                      disabled={!row.selected}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      {accOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.category_id}
                      onChange={e => update(i, { category_id: e.target.value })}
                      disabled={!row.selected}
                      className={`w-full px-2 py-1.5 border rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 ${
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

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {missing > 0 && (
              <p className="text-amber-500 dark:text-amber-400 text-xs font-medium mb-0.5">
                ⚠️ {missing} movimentação(ões) sem categoria.
              </p>
            )}
            <p>{selected.length} de {rows.length} serão importadas</p>
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
      </Card>
    </div>
  )

  // ── Step: done ────────────────────────────────────────────────────────────
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
              onClick={() => { setStep('upload'); setRows([]); setResult(null); setFileName('') }}
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
