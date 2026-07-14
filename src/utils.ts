export function formatRupiah(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

export function formatKwh(val: number) {
  return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Parse indonesian decimal (comma or dot)
export function parseLocalNumber(s: string): number {
  return parseFloat(s.replace(',', '.'))
}
