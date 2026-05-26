interface PaginationProps {
  page: number
  totalPages: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function Pagination({ page, totalPages, perPage, total, onPageChange, onPerPageChange }: PaginationProps) {
  if (total === 0) return null

  const from = Math.min((page - 1) * perPage + 1, total)
  const to   = Math.min(page * perPage, total)

  const range = 2
  const start = Math.max(1, page - range)
  const end   = Math.min(totalPages, page + range)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{from}–{to} de {total.toLocaleString('pt-BR')} registros</span>
        <div className="flex items-center gap-2">
          <span className="text-xs">Por página:</span>
          <div className="flex gap-1">
            {[10, 25, 50, 100].map(n => (
              <button key={n} onClick={() => onPerPageChange(n)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  perPage === n ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
            className="px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">
            ‹
          </button>

          {start > 1 && <>
            <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">1</button>
            {start > 2 && <span className="px-2 text-slate-300 dark:text-slate-600">…</span>}
          </>}

          {pages.map(p => (
            <button key={p} onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                p === page ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}>
              {p}
            </button>
          ))}

          {end < totalPages && <>
            {end < totalPages - 1 && <span className="px-2 text-slate-300 dark:text-slate-600">…</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">{totalPages}</button>
          </>}

          <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
            className="px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">
            ›
          </button>
        </div>
      )}
    </div>
  )
}
