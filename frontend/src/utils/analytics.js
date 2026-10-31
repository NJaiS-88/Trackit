export const ANALYTICS_RANGES = [7, 30, 90]

export const formatPercent = (value) => (value == null ? '—' : `${value}%`)

/** Minutes under an hour, hours under two days, days beyond that. */
export function formatDuration(hours) {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

/** Colour a rate: green at target, amber close to it, red below. */
export function rateTone(value, target = 90) {
  if (value == null) return ''
  if (value >= target) return 'kpi-good'
  if (value >= target - 15) return 'kpi-warn'
  return 'kpi-bad'
}
