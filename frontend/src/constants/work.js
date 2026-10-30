import { deadlineOf } from '../utils/format'

export const WORK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED']

/** Share of the time between assignment and deadline after which open work counts as due soon. */
export const DUE_SOON_THRESHOLD = 0.8

/**
 * 'overdue' once the deadline has passed, 'due-soon' once 80% of the time from assignment to deadline is used,
 * otherwise null. Completed work and work without a deadline are never flagged.
 */
export function deadlineState(item, now = Date.now()) {
  if (!item.dueDate || item.status === 'COMPLETED') return null
  const deadline = deadlineOf(item.dueDate, item.dueTime).getTime()
  if (now >= deadline) return 'overdue'
  const start = new Date(item.assignedAt ?? item.createdAt).getTime()
  if (deadline <= start) return 'due-soon'
  return (now - start) / (deadline - start) >= DUE_SOON_THRESHOLD ? 'due-soon' : null
}

export const WORK_STATUS_LABELS = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DECLINED: "Can't Do",
}

export const WORK_STATUS_BADGE_CLASS = {
  ASSIGNED: 'status-assigned',
  IN_PROGRESS: 'status-in_progress',
  COMPLETED: 'status-resolved',
  DECLINED: 'status-rejected',
}

export const WORK_TYPES = ['PROJECT_TASK', 'TICKET']

export const WORK_TYPE_LABELS = {
  PROJECT_TASK: 'Project task',
  TICKET: 'Ticket',
}

/** Stat cards shared by the Lead, admin and employee views; `key` is a status or 'total'. */
export const WORK_STATS = [
  { label: 'Assigned', key: 'ASSIGNED', tone: 'info' },
  { label: 'In Progress', key: 'IN_PROGRESS', tone: 'accent' },
  { label: 'Completed', key: 'COMPLETED', tone: 'success' },
  { label: "Can't Do", key: 'DECLINED', tone: 'danger' },
]

export function countByStatus(items) {
  const counts = { total: items.length, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0, DECLINED: 0 }
  items.forEach((item) => {
    counts[item.status] += 1
  })
  return counts
}

/** "Website redesign" for a task, "INC-2026-000012" for a ticket. */
export function workSource(item) {
  return item.type === 'TICKET' ? (item.incidentNumber ?? 'Ticket') : (item.projectName ?? 'Project')
}
