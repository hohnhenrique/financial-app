import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  padding?: boolean   // false = sem padding interno (para tabelas que tocam as bordas)
}

export function Card({ children, className, title, subtitle, action, padding = false }: CardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden',
      className
    )}>
      {(title || action) && (
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            {title    && <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>}
            {subtitle && <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {padding
        ? <div className="px-6 pt-5 pb-6">{children}</div>
        : children
      }
    </div>
  )
}
