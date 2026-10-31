const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

/** "2.4 MB", "830 KB", "120 B". */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const exactTimeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })

/** Time of day with seconds, e.g. "5:30:12 PM". */
export function formatTime(value) {
  return value ? exactTimeFormatter.format(new Date(value)) : '—'
}

/** For calendar dates without a time ("2026-11-05"), which `new Date` would read as UTC midnight. */
export function formatDay(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

/** A deadline as a local Date: the given time ("17:30") on that day, or the end of the day without one. */
export function deadlineOf(date, time) {
  const [year, month, day] = date.split('-').map(Number)
  if (!time) return new Date(year, month - 1, day, 23, 59, 59, 999)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

/** "Nov 5, 2026" or "Nov 5, 2026, 5:30 PM". */
export function formatDeadline(date, time) {
  if (!date) return '—'
  return time ? `${formatDay(date)}, ${timeFormatter.format(deadlineOf(date, time))}` : formatDay(date)
}

export function isPastDeadline(date, time) {
  return Boolean(date) && deadlineOf(date, time) < new Date()
}

/** Today as "YYYY-MM-DD" in local time, for date inputs' `min`. */
export function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
