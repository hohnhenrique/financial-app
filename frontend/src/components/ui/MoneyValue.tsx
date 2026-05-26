import { useVisibility } from '@/context/VisibilityContext'
import { formatMoney } from '@/utils/format'

interface MoneyValueProps {
  cents: number
  className?: string
  showSign?: boolean
  positiveClass?: string
  negativeClass?: string
}

export function MoneyValue({ cents, className = '', showSign = false, positiveClass = '', negativeClass = '' }: MoneyValueProps) {
  const { visible } = useVisibility()

  const colorClass = showSign
    ? cents >= 0 ? positiveClass : negativeClass
    : ''

  return (
    <span className={`${className} ${colorClass} transition-all`}>
      {visible
        ? `${showSign && cents > 0 ? '+' : ''}${formatMoney(cents)}`
        : '••••••'
      }
    </span>
  )
}
