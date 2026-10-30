const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

/** For calendar dates without a time ("2026-11-05"), which `new Date` would read as UTC midnight. */
export function formatDay(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

/** True when a calendar date ("2026-11-05") is before today. */
export function isPastDay(value) {
  if (!value) return false
  const [year, month, day] = value.split('-').map(Number)
  const today = new Date()
  return new Date(year, month - 1, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

/** Today as "YYYY-MM-DD" in local time, for date inputs' `min`. */
export function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
