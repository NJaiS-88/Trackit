import { formatDate, formatDuration, formatShortTime } from '../utils/format'

/** Incident statuses in which the SLA clock is not running. */
const CLOCK_STOPPED = new Set(['ON_HOLD', 'RESOLVED', 'CLOSED'])

/**
 * A ticket's SLA deadline and state, styled like work-item due dates: time left while the clock runs,
 * "Due soon" in the last 20% of the target, "Breached" once past, "Paused" while On Hold, and "Met" or
 * "Breached" once resolved. Pass `now` from useNow() so the time left keeps updating.
 */
export default function SlaBadge({ dueAt, slaStatus, status, now }) {
  if (!dueAt) return <span className="text-muted">—</span>

  const timeLeft = new Date(dueAt).getTime() - now
  // Without the ticket status (work items), trust the server's slaStatus for paused/resolved tickets
  const running = status ? !CLOCK_STOPPED.has(status) : slaStatus === 'NORMAL' || slaStatus === 'DUE_SOON'
  // The server works the status out per request; an open page can outlive the deadline
  const state = running && timeLeft <= 0 ? 'BREACHED' : slaStatus

  let className = ''
  let flag = null
  let detail = null
  if (state === 'MET') {
    className = 'due-met'
    flag = 'Met'
  } else if (state === 'BREACHED') {
    className = 'due-overdue'
    flag = 'Breached'
    detail = running ? `${formatDuration(timeLeft)} ago` : null
  } else if (status === 'ON_HOLD') {
    className = 'due-paused'
    flag = 'Paused'
  } else if (state === 'DUE_SOON') {
    className = 'due-due-soon'
    flag = 'Due soon'
    detail = `${formatDuration(timeLeft)} left`
  } else {
    detail = `in ${formatDuration(timeLeft)}`
  }

  return (
    <span className={`due-date ${className}`}>
      <span>{formatDate(dueAt)}</span>
      <span className="due-time">{formatShortTime(dueAt)}</span>
      {flag && <span className="due-flag">{flag}</span>}
      {detail && <span className="sla-detail">{detail}</span>}
    </span>
  )
}
