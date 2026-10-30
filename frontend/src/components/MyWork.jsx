import { useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { completeWork, declineWork, getMyWork, startWork } from '../api/workApi'
import { WORK_TYPE_LABELS, deadlineState, workSource } from '../constants/work'
import { useNow } from '../hooks/useNow'
import { formatDate } from '../utils/format'
import DeadlineAlert from './DeadlineAlert'
import DueDate from './DueDate'
import PriorityBadge from './PriorityBadge'
import Spinner from './Spinner'
import WorkStatusBadge from './WorkStatusBadge'

const OPEN_STATUSES = new Set(['ASSIGNED', 'IN_PROGRESS'])

/** The signed-in employee's assigned work, with Start / Mark as done / Can't do actions. */
export default function MyWork() {
  const now = useNow()
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [message, setMessage] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [pendingId, setPendingId] = useState(null)
  const [declining, setDeclining] = useState(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let ignore = false
    getMyWork()
      .then((data) => {
        if (!ignore) setResult({ key: reloadCount, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult((prev) => ({ key: reloadCount, data: prev.data, error: parseApiError(err).message }))
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const loading = result.key !== reloadCount
  const items = useMemo(() => result.data ?? [], [result.data])
  const openItems = items.filter((w) => OPEN_STATUSES.has(w.status))
  const pastItems = items.filter((w) => !OPEN_STATUSES.has(w.status))

  const replaceItem = (updated) => {
    setResult((prev) => ({ ...prev, data: prev.data.map((w) => (w.id === updated.id ? updated : w)) }))
  }

  const runAction = async (item, action, successMessage) => {
    setActionError(null)
    setMessage(null)
    setPendingId(item.id)
    try {
      replaceItem(await action())
      setMessage(successMessage)
      return true
    } catch (error) {
      setActionError(parseApiError(error).message)
      return false
    } finally {
      setPendingId(null)
    }
  }

  const openDecline = (item) => {
    setDeclining(item)
    setReason('')
    setReasonError(null)
    setMessage(null)
    setActionError(null)
  }

  const submitDecline = async (event) => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (trimmed.length < 5 || trimmed.length > 500) {
      setReasonError('Please explain in 5 to 500 characters')
      return
    }
    const done = await runAction(
      declining,
      () => declineWork(declining.id, trimmed),
      `Your Lead has been told you can't do "${declining.title}".`,
    )
    if (done) setDeclining(null)
  }

  const handleComplete = (item) => {
    const note = item.type === 'TICKET' ? ' The ticket will be marked as resolved.' : ''
    if (!window.confirm(`Mark "${item.title}" as done?${note}`)) return
    runAction(item, () => completeWork(item.id), `"${item.title}" marked as done.`)
  }

  return (
    <section className="section" aria-label="My work">
      <div className="section-header">
        <h2>My work</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setReloadCount((count) => count + 1)}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      <DeadlineAlert items={items} now={now} />

      {message && (
        <div className="alert alert-success section-alert" role="status">
          {message}
        </div>
      )}
      {(actionError || (!loading && result.error)) && (
        <div className="alert alert-error section-alert" role="alert">
          {actionError ?? result.error}
        </div>
      )}

      {declining && (
        <form className="card glass decline-panel" onSubmit={submitDecline} noValidate>
          <h3>Can&apos;t do “{declining.title}”</h3>
          <p className="text-muted">Tell your Lead why, so they can reassign it or help you.</p>
          <textarea
            className="control"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setReasonError(null)
            }}
            placeholder="e.g. I don't have access to the billing system"
            aria-label="Reason"
            aria-invalid={Boolean(reasonError)}
            autoFocus
          />
          {reasonError && <p className="field-error">{reasonError}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDeclining(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={pendingId === declining.id}>
              {pendingId === declining.id ? 'Sending…' : 'Send to Lead'}
            </button>
          </div>
        </form>
      )}

      <div className="table-card glass">
        <table className="data-table">
          <thead>
            <tr>
              <th>Work</th>
              <th>Assigned by</th>
              <th>Due</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading && !result.data && (
              <tr>
                <td colSpan={5} className="table-empty">
                  <Spinner size={20} label="Loading your work" />
                </td>
              </tr>
            )}
            {result.data && openItems.length === 0 && (
              <tr>
                <td colSpan={5} className="table-empty">
                  You&apos;re all caught up. No open work assigned to you.
                </td>
              </tr>
            )}
            {openItems.map((w) => {
              const pending = pendingId === w.id
              const urgency = deadlineState(w, now)
              return (
                <tr key={w.id} className={urgency ? `row-${urgency}` : undefined}>
                  <td>
                    <div className="cell-title">{w.title}</div>
                    <div className="cell-sub">
                      {WORK_TYPE_LABELS[w.type]} · {workSource(w)}
                      {w.priority && (
                        <>
                          {' '}
                          <PriorityBadge priority={w.priority} />
                        </>
                      )}
                    </div>
                    {w.description && <div className="cell-description">{w.description}</div>}
                  </td>
                  <td className="cell-muted">{w.assignedByName ?? '—'}</td>
                  <td className="cell-muted">
                    <DueDate item={w} now={now} />
                  </td>
                  <td>
                    <WorkStatusBadge status={w.status} />
                  </td>
                  <td className="cell-actions">
                    <div className="action-group">
                      {w.status === 'ASSIGNED' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => runAction(w, () => startWork(w.id), `Started "${w.title}".`)}
                          disabled={pending}
                        >
                          Start
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleComplete(w)}
                        disabled={pending}
                      >
                        {pending ? 'Saving…' : 'Mark as done'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => openDecline(w)}
                        disabled={pending}
                      >
                        Can&apos;t do
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pastItems.length > 0 && (
        <div className="history-toggle">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide' : 'Show'} completed and declined work ({pastItems.length})
          </button>
        </div>
      )}

      {showHistory && pastItems.length > 0 && (
        <div className="table-card glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pastItems.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div className="cell-title">{w.title}</div>
                    <div className="cell-sub">
                      {WORK_TYPE_LABELS[w.type]} · {workSource(w)}
                    </div>
                  </td>
                  <td>
                    <WorkStatusBadge status={w.status} />
                  </td>
                  <td className="cell-muted">{w.declineReason ?? '—'}</td>
                  <td className="cell-muted">{formatDate(w.completedAt ?? w.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
