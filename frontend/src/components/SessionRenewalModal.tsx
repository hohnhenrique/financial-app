import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'

const WARNING_BEFORE_MS = 5 * 60 * 1000   // avisa 5 min antes
const CHECK_INTERVAL_MS = 60 * 1000        // verifica a cada 1 min

export function SessionRenewalModal() {
  const { user, logout } = useAuth()
  const [show, setShow]   = useState(false)
  const [seconds, setSeconds] = useState(300)

  const renew = useCallback(async () => {
    try {
      await authApi.me()   // renova a sessão fazendo um request autenticado
      setShow(false)
      setSeconds(300)
      localStorage.setItem('session_renewed_at', String(Date.now()))
    } catch {
      logout()
    }
  }, [logout])

  useEffect(() => {
    if (!user) return

    const sessionLifetimeMs = parseInt(localStorage.getItem('session_lifetime') ?? '480') * 60 * 1000
    const renewedAt = parseInt(localStorage.getItem('session_renewed_at') ?? String(Date.now()))

    const interval = setInterval(() => {
      const elapsed   = Date.now() - renewedAt
      const remaining = sessionLifetimeMs - elapsed

      if (remaining <= WARNING_BEFORE_MS && remaining > 0) {
        setSeconds(Math.floor(remaining / 1000))
        setShow(true)
      } else if (remaining <= 0) {
        logout()
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [user, logout])

  // Countdown quando o modal está aberto
  useEffect(() => {
    if (!show) return
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { logout(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [show, logout])

  if (!show || !user) return null

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
          Sessão prestes a expirar
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Sua sessão expira em{' '}
          <span className="font-bold text-amber-500">
            {mins > 0 ? `${mins}m ` : ''}{String(secs).padStart(2, '0')}s
          </span>
          . Deseja continuar conectado?
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => { setShow(false); logout() }}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Sair
          </button>
          <button
            onClick={renew}
            className="flex-1 px-4 py-2.5 bg-[#1B4F8A] hover:bg-[#163f6e] text-white rounded-xl text-sm font-semibold transition-all"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  )
}
