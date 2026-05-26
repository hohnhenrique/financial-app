export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return Math.round(parseFloat(normalized || '0') * 100)
}
