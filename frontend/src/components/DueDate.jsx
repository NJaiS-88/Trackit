import { formatDay, isPastDay } from '../utils/format'

/** A due date, flagged as overdue while the work is still open. */
export default function DueDate({ value, open }) {
  if (!value) return <span className="text-muted">—</span>
  const overdue = open && isPastDay(value)
  return (
    <span className={overdue ? 'due-overdue' : undefined} title={overdue ? 'Overdue' : undefined}>
      {formatDay(value)}
      {overdue && ' · Overdue'}
    </span>
  )
}
