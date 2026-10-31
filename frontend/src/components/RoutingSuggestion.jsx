import { formatDateTime } from '../utils/format'

const CONFIDENCE_LABELS = {
  HIGH: 'High confidence',
  MEDIUM: 'Medium confidence',
  LOW: 'Low confidence',
}

/**
 * The AI's suggestion of which department should handle a ticket. Advice only: the Lead decides.
 * Renders nothing when there is no recommendation.
 */
export default function RoutingSuggestion({ recommendation }) {
  if (!recommendation) return null
  const { departmentName, confidence, reason, stay, model, generatedAt, handoffNote } = recommendation
  const confidenceLabel = CONFIDENCE_LABELS[confidence] ?? confidence

  return (
    <div
      className={`routing-suggestion ${stay ? 'routing-stay' : 'routing-move'}`}
      title={`Suggested by ${model ?? 'AI'} on ${formatDateTime(generatedAt)}`}
    >
      <div className="routing-suggestion-head">
        {stay ? (
          <span>
            AI: keep in your department · <span className="routing-confidence">{confidenceLabel}</span>
          </span>
        ) : (
          <span>
            AI suggests <strong>{departmentName}</strong> ·{' '}
            <span className="routing-confidence">{confidenceLabel}</span>
          </span>
        )}
      </div>
      {reason && <p className="routing-reason">{reason}</p>}
      {!stay && handoffNote && (
        <div className="routing-handoff">
          <span className="routing-handoff-label">AI-written note for the {departmentName} Lead</span>
          <p>{handoffNote}</p>
        </div>
      )}
    </div>
  )
}
