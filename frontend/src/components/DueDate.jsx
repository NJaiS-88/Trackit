import { formatDeadline, isPastDeadline } from '../utils/format'

/** A deadline (date, optionally with a time), flagged as overdue while the work is still open. */
export default function DueDate({ value, time, open }) {
  if (!value) return <span className="text-muted">—</span>
  const overdue = open && isPastDeadline(value, time)
  return (
    <span className={overdue ? 'due-overdue' : undefined} title={overdue ? 'Overdue' : undefined}>
      {formatDeadline(value, time)}
      {overdue && ' · Overdue'}
    </span>
  )
}
