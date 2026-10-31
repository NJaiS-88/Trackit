import { useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { transferTicket } from '../api/workApi'
import Spinner from './Spinner'

const OPEN_WORK = new Set(['ASSIGNED', 'IN_PROGRESS', 'DECLINED'])
const MAX_NOTE = 500

/**
 * Lets a Lead pass a ticket to another department's Lead; shown inside a modal that provides the title.
 * The AI's suggestion is preselected when there is one; `onPassed` receives the saved transfer.
 */
export default function PassTicketPanel({ ticket, departments, onCancel, onPassed }) {
  const recommendation = ticket.routingRecommendation
  const options = departments.filter((d) => !d.own)
  const suggestedId =
    recommendation && !recommendation.stay && options.some((d) => d.id === recommendation.departmentId)
      ? recommendation.departmentId
      : ''
  const [departmentId, setDepartmentId] = useState(suggestedId)
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const hasOpenWork = ticket.assignees.some((a) => OPEN_WORK.has(a.status))
  const chosen = options.find((d) => d.id === departmentId)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!departmentId) {
      setError('Choose a department')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      onPassed(await transferTicket(ticket.id, departmentId, note))
    } catch (err) {
      setError(parseApiError(err).message)
      setSubmitting(false)
    }
  }

  return (
    <form className="pass-panel" onSubmit={handleSubmit} noValidate>
      <p className="ai-modal-ticket">{ticket.title}</p>

      {hasOpenWork && (
        <p className="alert alert-warning">
          Employees are still assigned to this ticket. Finish or reassign their work before passing it.
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-muted">There are no other departments to pass this ticket to.</p>
      ) : (
        <>
          <label className="pass-panel-field">
            <span>Department</span>
            <select
              className="control"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value)
                setError(null)
              }}
              disabled={submitting || hasOpenWork}
            >
              <option value="">Choose a department</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.id === suggestedId ? ' (AI suggestion)' : ''}
                </option>
              ))}
            </select>
          </label>
          {chosen && (
            <p className="pass-panel-hint">
              {chosen.leads.length > 0
                ? `It will go to ${chosen.leads.join(', ')}.`
                : `${chosen.name} has no Lead yet, so nobody will pick it up until one is added.`}
            </p>
          )}

          <label className="pass-panel-field">
            <span>
              Note for the Lead <span className="text-muted">(optional)</span>
            </span>
            <textarea
              className="control"
              rows={2}
              maxLength={MAX_NOTE}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Payroll report, not an IT issue"
              disabled={submitting || hasOpenWork}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

        </>
      )}

      <div className="pass-panel-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        {options.length > 0 && (
          <button type="submit" className="btn btn-primary" disabled={submitting || hasOpenWork}>
            {submitting && <Spinner />}
            {submitting ? 'Passing…' : 'Pass ticket'}
          </button>
        )}
      </div>
    </form>
  )
}
