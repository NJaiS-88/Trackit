import { STATUS_LABELS } from '../constants/incident'

export default function StatusBadge({ status }) {
  if (!status) return null
  return <span className={`badge status-${status.toLowerCase()}`}>{STATUS_LABELS[status] ?? status}</span>
}
