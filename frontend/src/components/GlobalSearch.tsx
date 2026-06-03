import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi, type SearchResult } from '@/api/search'
import { formatMoney, formatDate } from '@/utils/format'

const TYPE_ICONS: Record<string, string> = {
  transaction: '💸', account: '🏦', category: '🏷️', goal: '🎯', task: '✅'
}
const TYPE_LABELS: Record<string, string> = {
  transaction: 'Movimentação', account: 'Conta', category: 'Categoria', goal: 'Meta', task: 'Tarefa'
}
const TYPE_ROUTES: Record<string, (r: SearchResult) => string> = {
  transaction: () => '/transactions',
  account:     () => '/accounts',
  category:    () => '/categories',
  goal:        () => '/goals',
  task:        () => '/tasks',
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Abre com Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [open])

  const search = useCallback((q: string) => {
    clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchApi.search(q)
        setResults(res.data.data.results)
        setCursor(0)
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) go(results[cursor])
  }

  const go = (r: SearchResult) => {
    const route = TYPE_ROUTES[r.type_name]?.(r)
    if (route) navigate(route)
    setOpen(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <span className="hidden sm:inline">Buscar</span>
      <kbd className="hidden sm:inline text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value) }}
            onKeyDown={handleKey}
            placeholder="Buscar movimentações, contas, metas..."
            className="flex-1 bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400 text-sm focus:outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />}
          <kbd onClick={() => setOpen(false)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 font-mono text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {/* Agrupa por tipo */}
            {Object.entries(
              results.reduce((acc, r) => {
                acc[r.type_name] = [...(acc[r.type_name] ?? []), r]
                return acc
              }, {} as Record<string, SearchResult[]>)
            ).map(([type, items]) => (
              <div key={type}>
                <p className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {TYPE_ICONS[type]} {TYPE_LABELS[type] ?? type}
                </p>
                {items.map((r, i) => {
                  const idx = results.indexOf(r)
                  return (
                    <button key={r.id} onClick={() => go(r)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                        cursor === idx ? 'dark:bg-slate-700/70' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                      style={cursor === idx ? { backgroundColor: 'var(--color-primary)15' } : undefined}
                    >
                      {r.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.label}</p>
                        {r.date && <p className="text-xs text-slate-400">{formatDate(r.date)}</p>}
                        {r.status && <p className="text-xs text-slate-400 capitalize">{r.status}</p>}
                      </div>
                      {r.amount_cents !== undefined && (
                        <p className={`text-sm font-semibold flex-shrink-0 ${r.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {r.type === 'income' ? '+' : '-'}{formatMoney(r.amount_cents)}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !loading && (
          <div className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Nenhum resultado para <strong>"{query}"</strong>
          </div>
        )}

        {query.length < 2 && (
          <div className="px-5 py-6 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
            <p>Digite pelo menos 2 caracteres para buscar</p>
            <p>Pesquisa em movimentações, contas, categorias, metas e tarefas</p>
          </div>
        )}
      </div>
    </div>
  )
}
