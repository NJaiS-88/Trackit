import { WORK_STATUS_BADGE_CLASS, WORK_STATUS_LABELS } from '../constants/work'

export default function WorkStatusBadge({ status }) {
  if (!status) return null
  return <span className={`badge ${WORK_STATUS_BADGE_CLASS[status]}`}>{WORK_STATUS_LABELS[status] ?? status}</span>
}
