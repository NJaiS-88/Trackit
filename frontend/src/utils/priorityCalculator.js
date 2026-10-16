const PRIORITY_MATRIX = {
  HIGH: { HIGH: 'P1', MEDIUM: 'P2', LOW: 'P2' },
  MEDIUM: { HIGH: 'P2', MEDIUM: 'P3', LOW: 'P3' },
  LOW: { HIGH: 'P3', MEDIUM: 'P4', LOW: 'P4' },
}

export function previewPriority(impact, urgency) {
  return impact && urgency ? PRIORITY_MATRIX[impact]?.[urgency] ?? null : null
}
