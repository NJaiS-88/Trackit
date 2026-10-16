import { PRIORITY_LABELS } from '../constants/incident'

export default function PriorityBadge({ priority, label }) {
  if (!priority) return null
  return (
    <span className={`badge priority-${priority.toLowerCase()}`}>
      <span className="badge-dot" aria-hidden="true" />
      {priority} {label ?? PRIORITY_LABELS[priority]}
    </span>
  )
}
