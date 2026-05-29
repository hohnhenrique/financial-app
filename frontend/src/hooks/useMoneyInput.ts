import { useState, useCallback } from 'react'

/**
 * Hook para campo de valor com formatação automática em BRL.
 * Retorna { displayValue, rawCents, onChange, reset }
 *
 * displayValue → string formatada para exibição no input (ex: "1.234,56")
 * rawCents     → número inteiro em centavos (ex: 123456)
 * onChange     → handler para o evento input
 */
export function useMoneyInput(initialCents = 0) {
  const [cents, setCents] = useState(initialCents)

  const centsToDisplay = (c: number): string => {
    if (c === 0) return ''
    return (c / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const [display, setDisplay] = useState(() => centsToDisplay(initialCents))

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não for dígito
    const digits = e.target.value.replace(/\D/g, '')
    const c      = parseInt(digits || '0', 10)
    setCents(c)
    setDisplay(centsToDisplay(c))
  }, [])

  const reset = useCallback((newCents = 0) => {
    setCents(newCents)
    setDisplay(centsToDisplay(newCents))
  }, [])

  // String no formato que a API espera (ex: "1234.56")
  const apiValue = (cents / 100).toFixed(2)

  return { displayValue: display, rawCents: cents, apiValue, onChange, reset }
}
