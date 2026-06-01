import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2',
              'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700',
              'text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500',
              'focus:ring-2 focus:ring-offset-0',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
              prefix && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
