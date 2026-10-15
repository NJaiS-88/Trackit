export const INCIDENT_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'REOPENED',
  'CLOSED',
]

export const STATUS_LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
}

export const PRIORITIES = ['P1', 'P2', 'P3', 'P4']

export const PRIORITY_LABELS = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
}

export const CATEGORIES = ['NETWORK', 'SOFTWARE', 'HARDWARE', 'DATABASE', 'SECURITY', 'BACKEND', 'OTHER']

export const CATEGORY_LABELS = {
  NETWORK: 'Network',
  SOFTWARE: 'Software',
  HARDWARE: 'Hardware',
  DATABASE: 'Database',
  SECURITY: 'Security',
  BACKEND: 'Backend',
  OTHER: 'Other',
}

/** Shared by Impact and Urgency. */
export const LEVELS = ['HIGH', 'MEDIUM', 'LOW']

export const LEVEL_LABELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}
