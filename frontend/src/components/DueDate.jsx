import { deadlineState } from '../constants/work'
import { deadlineOf, formatDay, formatShortTime } from '../utils/format'

/** A work item's deadline, flagged "Due soon" (80% of its time used) or "Overdue" while still open. */
export default function DueDate({ item, now }) {
  if (!item.dueDate) return <span className="text-muted">—</span>
  const state = deadlineState(item, now)
  return (
    <span className={`due-date${state ? ` due-${state}` : ''}`}>
      <span>{formatDay(item.dueDate)}</span>
      {item.dueTime && (
        <span className="due-time">{formatShortTime(deadlineOf(item.dueDate, item.dueTime))}</span>
      )}
      {state === 'overdue' && <span className="due-flag">Overdue</span>}
      {state === 'due-soon' && <span className="due-flag">Due soon</span>}
    </span>
  )
}
