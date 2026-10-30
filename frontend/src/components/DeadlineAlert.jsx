import { deadlineState } from '../constants/work'
import { formatDeadline } from '../utils/format'

const ACTIVE = new Set(['ASSIGNED', 'IN_PROGRESS'])

/** Work the employee still has to do that is overdue or has used 80% of its time, most urgent first. */
export function urgentWork(items, now) {
  return items
    .filter((w) => ACTIVE.has(w.status))
    .map((w) => ({ item: w, state: deadlineState(w, now) }))
    .filter((entry) => entry.state)
    .sort((a, b) => (a.state === b.state ? 0 : a.state === 'overdue' ? -1 : 1))
}

/** Banner listing the employee's overdue and due-soon work. */
export default function DeadlineAlert({ items, now }) {
  const urgent = urgentWork(items, now)
  if (urgent.length === 0) return null
  const overdue = urgent.filter((e) => e.state === 'overdue').length
  const dueSoon = urgent.length - overdue

  const summary = [
    overdue > 0 && `${overdue} ${overdue === 1 ? 'item is' : 'items are'} overdue`,
    dueSoon > 0 && `${dueSoon} ${dueSoon === 1 ? 'item is' : 'items are'} due soon`,
  ]
    .filter(Boolean)
    .join(' and ')

  return (
    <div className={`alert deadline-alert ${overdue > 0 ? 'alert-error' : 'alert-warning'}`} role="alert">
      <strong>Deadline alert:</strong> {summary}.
      <ul>
        {urgent.map(({ item, state }) => (
          <li key={item.id}>
            <span className="deadline-alert-title">{item.title}</span>
            {' — '}
            {state === 'overdue' ? 'was due' : 'due'} {formatDeadline(item.dueDate, item.dueTime)}
          </li>
        ))}
      </ul>
    </div>
  )
}
