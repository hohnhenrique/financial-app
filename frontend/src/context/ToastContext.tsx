import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  action?: { label: string; onClick: () => void }
  duration: number
}

interface ToastContextType {
  success: (msg: string, options?: ToastOptions) => void
  error:   (msg: string, options?: ToastOptions) => void
  info:    (msg: string, options?: ToastOptions) => void
  warning: (msg: string, options?: ToastOptions) => void
}

interface ToastOptions {
  duration?: number
  action?: { label: string; onClick: () => void }
}

const ToastContext = createContext<ToastContextType | null>(null)

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const remove = useCallback((id: number) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const add = useCallback((
    type: Toast['type'],
    message: string,
    options: ToastOptions = {}
  ) => {
    const id       = ++_id
    const duration = options.duration ?? 5000

    setToasts(t => [...t, { id, type, message, action: options.action, duration }])

    if (duration > 0) {
      timers.current[id] = setTimeout(() => remove(id), duration)
    }
  }, [remove])

  const ctx: ToastContextType = {
    success: (msg, opts) => add('success', msg, opts),
    error:   (msg, opts) => add('error',   msg, opts),
    info:    (msg, opts) => add('info',    msg, opts),
    warning: (msg, opts) => add('warning', msg, opts),
  }

  const ICON_PATHS = {
    success: 'M5 13l4 4L19 7',
    error:   'M6 18L18 6M6 6l12 12',
    info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  }

  const BG_CLASS = {
    success: 'bg-emerald-500',
    error:   'bg-red-500',
    info:    'bg-[#1B4F8A]',
    warning: 'bg-amber-500',
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Portal de toasts */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: 400, width: 'calc(100vw - 3rem)' }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className={`
              flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl
              text-sm font-medium pointer-events-auto text-white
              ${BG_CLASS[t.type]}
              transition-all duration-300
            `}
          >
            {/* Ícone */}
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON_PATHS[t.type]} />
            </svg>

            {/* Mensagem + ação */}
            <div className="flex-1 min-w-0">
              <p className="leading-snug">{t.message}</p>

              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); remove(t.id) }}
                  className="mt-1.5 text-xs font-bold underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
                >
                  {t.action.label}
                </button>
              )}
            </div>

            {/* Fechar */}
            <button
              onClick={() => remove(t.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
              aria-label="Fechar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            {/* Barra de progresso */}
            {t.duration > 0 && (
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-full"
                style={{
                  animation: `shrink ${t.duration}ms linear forwards`,
                  width: '100%',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve estar dentro de ToastProvider')
  return ctx
}
