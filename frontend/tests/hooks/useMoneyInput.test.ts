import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMoneyInput } from '@/hooks/useMoneyInput'

describe('useMoneyInput', () => {
  it('inicializa com zero', () => {
    const { result } = renderHook(() => useMoneyInput(0))
    expect(result.current.rawCents).toBe(0)
    expect(result.current.displayValue).toBe('')
  })

  it('inicializa com valor', () => {
    const { result } = renderHook(() => useMoneyInput(40000))
    expect(result.current.rawCents).toBe(40000)
    expect(result.current.displayValue).toBe('400,00')
  })

  it('formata enquanto digita', () => {
    const { result } = renderHook(() => useMoneyInput(0))

    act(() => {
      result.current.onChange({
        target: { value: '40000' }, // usuário digitou "400,00" → apenas dígitos
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.rawCents).toBe(40000)
    expect(result.current.displayValue).toBe('400,00')
    expect(result.current.apiValue).toBe('400,00')
  })

  it('apiValue nunca usa ponto como decimal', () => {
    const { result } = renderHook(() => useMoneyInput(123456))
    // Garante que não manda "1234.56" para a API (causaria o bug dos 40.000)
    expect(result.current.apiValue).not.toContain('.')
    expect(result.current.apiValue).toBe('1.234,56')
  })

  it('reseta corretamente', () => {
    const { result } = renderHook(() => useMoneyInput(40000))
    act(() => result.current.reset(0))
    expect(result.current.rawCents).toBe(0)
    expect(result.current.displayValue).toBe('')
  })
})
