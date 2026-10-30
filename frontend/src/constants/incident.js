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

// Reporters answer plain-language questions instead of picking Impact/Urgency levels, which they tend to
// inflate. Each answer maps to exactly one level, so the API and stored data still use HIGH/MEDIUM/LOW.

/** "Who is affected?" sets Impact. */
export const IMPACT_OPTIONS = [
  { value: 'LOW', label: 'Just me', hint: 'Only my own work is affected' },
  { value: 'MEDIUM', label: 'My team or department', hint: 'Several colleagues have the same problem' },
  {
    value: 'HIGH',
    label: 'Several teams or the whole company',
    hint: 'Many people, or a service the whole company relies on',
  },
]

/** "Can you keep working?" sets Urgency. */
export const URGENCY_OPTIONS = [
  { value: 'LOW', label: "Yes, it's an annoyance", hint: 'I can carry on as normal' },
  { value: 'MEDIUM', label: 'Partly, I have a workaround', hint: 'Slower or harder, but I can keep going' },
  { value: 'HIGH', label: "No, I'm completely blocked", hint: 'I cannot do my work until this is fixed' },
]

/** The answer behind a stored Impact level, e.g. 'LOW' → 'Just me'. */
export function impactAnswer(level) {
  return IMPACT_OPTIONS.find((option) => option.value === level)?.label ?? level
}

/** The answer behind a stored Urgency level, e.g. 'HIGH' → "No, I'm completely blocked". */
export function urgencyAnswer(level) {
  return URGENCY_OPTIONS.find((option) => option.value === level)?.label ?? level
}
