const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}
