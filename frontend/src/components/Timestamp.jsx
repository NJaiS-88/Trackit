import { formatDate, formatDateTime, formatTime } from '../utils/format'

/** A moment shown as its date with the exact time on the line below. */
export default function Timestamp({ value }) {
  if (!value) return <span className="text-muted">—</span>
  return (
    <time className="timestamp" dateTime={new Date(value).toISOString()} title={formatDateTime(value)}>
      <span>{formatDate(value)}</span>
      <span className="timestamp-time">{formatTime(value)}</span>
    </time>
  )
}
