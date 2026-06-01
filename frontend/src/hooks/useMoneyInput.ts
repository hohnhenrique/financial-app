import { useState, useCallback } from 'react'

/**
 * displayValue → string formatada BR para exibir no input ("1.234,56")
 * rawCents     → inteiro em centavos (123456)
 * apiValue     → string BR com vírgula ("1234,56") — o backend já sabe tratar
 */
export function useMoneyInput(initialCents = 0) {
  const fmt = (c: number): string =>
    c === 0 ? '' : (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const [cents, setCents]     = useState(initialCents)
  const [display, setDisplay] = useState(() => fmt(initialCents))

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // mantém só dígitos
    const digits = e.target.value.replace(/\D/g, '')
    const c      = parseInt(digits || '0', 10)
    setCents(c)
    setDisplay(fmt(c))
  }, [])

  const reset = useCallback((newCents = 0) => {
    setCents(newCents)
    setDisplay(fmt(newCents))
  }, [])

  // envia no formato BR com vírgula: "400,00" → backend lê corretamente
  const apiValue = fmt(cents)   // ex: "400,00"  "1.234,56"

  return { displayValue: display, rawCents: cents, apiValue, onChange, reset }
}
