interface SortHeaderProps {
  label: string
  field: string
  current: string
  direction: 'ASC' | 'DESC'
  onChange: (field: string, dir: 'ASC' | 'DESC') => void
  className?: string
}

export function SortHeader({ label, field, current, direction, onChange, className = '' }: SortHeaderProps) {
  const isActive = current === field
  const nextDir  = isActive && direction === 'DESC' ? 'ASC' : 'DESC'

  return (
    <th
      className={`px-6 py-3 text-left font-medium cursor-pointer select-none group ${className}`}
      onClick={() => onChange(field, nextDir)}
    >
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
        {label}
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {isActive && direction === 'ASC' ? '↑' : '↓'}
        </span>
      </div>
    </th>
  )
}
