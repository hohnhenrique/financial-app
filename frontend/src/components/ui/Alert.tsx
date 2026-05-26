import { cn } from '@/utils/cn'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  message: string
  className?: string
}

const styles: Record<AlertType, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
  error:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300',
  info:    'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300',
}

export function Alert({ type, message, className }: AlertProps) {
  if (!message) return null
  return (
    <div className={cn('px-4 py-3 border rounded-xl text-sm flex items-center gap-2', styles[type], className)}>
      {message}
    </div>
  )
}
