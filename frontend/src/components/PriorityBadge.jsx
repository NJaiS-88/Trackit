import { PRIORITY_LABELS } from '../constants/incident'

export default function PriorityBadge({ priority }) {
  if (!priority) return null
  return (
    <span className={`badge priority-${priority.toLowerCase()}`}>
      <span className="badge-dot" aria-hidden="true" />
      {priority} {PRIORITY_LABELS[priority]}
    </span>
  )
}
