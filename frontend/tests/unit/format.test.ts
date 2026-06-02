import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate, parseMoneyInput } from '@/utils/format'

describe('formatMoney', () => {
  it('formata centavos em BRL', () => {
    expect(formatMoney(100)).toBe('R$\u00a00,01')   // R$ 0,01
    expect(formatMoney(10000)).toBe('R$\u00a0100,00')
    expect(formatMoney(123456)).toBe('R$\u00a01.234,56')
    expect(formatMoney(0)).toBe('R$\u00a00,00')
  })

  it('formata valores grandes', () => {
    expect(formatMoney(1000000)).toBe('R$\u00a010.000,00')
  })
})

describe('formatDate', () => {
  it('converte YYYY-MM-DD para DD/MM/AAAA', () => {
    expect(formatDate('2025-12-25')).toBe('25/12/2025')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })
})

describe('parseMoneyInput', () => {
  it('converte string BR para centavos', () => {
    expect(parseMoneyInput('400,00')).toBe(40000)
    expect(parseMoneyInput('1.234,56')).toBe(123456)
    expect(parseMoneyInput('0,01')).toBe(1)
    expect(parseMoneyInput('')).toBe(0)
  })
})
