import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

const TYPE_STYLES = {
  error:   { dot: 'bg-red-500',    icon: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
  warning: { dot: 'bg-amber-500',  icon: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  info:    { dot: 'bg-blue-500',   icon: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  success: { dot: 'bg-emerald-500',icon: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.list().then(r => r.data.data),
    refetchInterval: 60_000, // revalida a cada 1 minuto
  })

  const count         = data?.count ?? 0
  const notifications = data?.notifications ?? []

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        title="Notificações"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Notificações</h3>
            {count > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">
                {count} nova{count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0
              ? (
                <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Tudo certo por aqui!
                </div>
              )
              : notifications.map(n => {
                  const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.info
                  return (
                    <div key={n.id} className={`px-5 py-4 border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${style.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${style.dot}`} />
                        <div>
                          <p className={`text-xs font-semibold ${style.icon}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}
    </div>
  )
}
