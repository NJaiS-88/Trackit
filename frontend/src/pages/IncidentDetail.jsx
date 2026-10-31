import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { changeStatus, getIncidentById } from '../api/incidentApi'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import Timestamp from '../components/Timestamp'
import WorkStatusBadge from '../components/WorkStatusBadge'
import { CATEGORY_LABELS, impactAnswer, LEVEL_LABELS, STATUS_LABELS, urgencyAnswer } from '../constants/incident'
import { useAuth } from '../hooks/useAuth'

const ERROR_MESSAGES = {
  403: "You don't have access to this incident.",
  404: 'This incident does not exist or has been deleted.',
}

const ALLOWED_TRANSITIONS = {
  OPEN: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['ASSIGNED'],
  CLOSED: [],
}

const WORKFLOW_STEPS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const WORKFLOW_STEP_INDEX = {
  OPEN: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  ON_HOLD: 2,
  RESOLVED: 3,
  REOPENED: 1,
  CLOSED: 4,
}

export default function IncidentDetail() {
  const { id } = useParams()
  const { role } = useAuth()
  const [state, setState] = useState({ incident: null, error: null, loading: true, forId: id })
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [statusError, setStatusError] = useState(null)
  const [statusSubmitting, setStatusSubmitting] = useState(false)

  // Reset synchronously when navigating between incidents so stale data never flashes
  if (state.forId !== id) {
    setState({ incident: null, error: null, loading: true, forId: id })
  }

  useEffect(() => {
    let ignore = false
    getIncidentById(id)
      .then((incident) => {
        if (!ignore) setState({ incident, error: null, loading: false, forId: id })
      })
      .catch((err) => {
        if (ignore) return
        const { status, message } = parseApiError(err)
        setState({ incident: null, error: ERROR_MESSAGES[status] ?? message, loading: false, forId: id })
      })
    return () => {
      ignore = true
    }
  }, [id])

  const { incident, error, loading } = state

  const handleStatusSubmit = async (event) => {
    event.preventDefault()
    setStatusError(null)
    setStatusSubmitting(true)
    try {
      const updatedIncident = await changeStatus(id, { newStatus, reason })
      setState((current) => ({ ...current, incident: updatedIncident }))
      setNewStatus('')
      setReason('')

      try {
        const refreshedIncident = await getIncidentById(id)
        setState((current) => ({ ...current, incident: refreshedIncident }))
      } catch {
        setStatusError('Status changed, but the incident could not be refreshed. Reload to verify.')
      }
    } catch (err) {
      const { status, message } = parseApiError(err)
      if (status === 400) setStatusError('This status transition is not allowed')
      else if (status === 403) setStatusError("You are not authorized to change this incident's status")
      else setStatusError(message)
    } finally {
      setStatusSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page page-center">
        <Spinner size={28} label="Loading incident" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page page-narrow">
        <Link to="/incidents" className="back-link">
          ← Back to incidents
        </Link>
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    )
  }

  const meta = [
    { label: 'Created by', value: incident.createdByName ?? 'Unknown user' },
    { label: 'Assigned to', value: incident.assignedToName ?? 'Unassigned' },
    ...(incident.workAssignees?.length > 0
      ? [
          {
            label: 'Handled by',
            value: (
              <ul className="assignee-list">
                {incident.workAssignees.map((a) => (
                  <li key={a.workItemId}>
                    <span>{a.name ?? 'Unknown employee'}</span>
                    <WorkStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { label: 'Category', value: CATEGORY_LABELS[incident.category] ?? incident.category },
    { label: 'Affected Service', value: incident.affectedService ?? '—' },
    // The reporter's own answer, with the level it maps to for engineers triaging the ticket
    {
      label: 'Who is affected',
      value: `${impactAnswer(incident.impact)} (${LEVEL_LABELS[incident.impact] ?? incident.impact} impact)`,
    },
    {
      label: 'Can they keep working',
      value: `${urgencyAnswer(incident.urgency)} (${LEVEL_LABELS[incident.urgency] ?? incident.urgency} urgency)`,
    },
    { label: 'Priority', value: <PriorityBadge priority={incident.priority} label={incident.priorityLabel} /> },
    { label: 'Created At', value: <Timestamp value={incident.createdAt} /> },
    { label: 'Last Updated', value: <Timestamp value={incident.updatedAt} /> },
  ]
  const canChangeStatus = role === 'ENGINEER' || role === 'ADMIN'
  const allowedTransitions = ALLOWED_TRANSITIONS[incident.status] ?? []
  const currentWorkflowStep = WORKFLOW_STEP_INDEX[incident.status] ?? 0

  return (
    <div className="page page-narrow">
      <Link to="/incidents" className="back-link">
        ← Back to incidents
      </Link>

      <header className="detail-header card glass">
        <span className="detail-number">{incident.incidentNumber}</span>
        <h1>{incident.title}</h1>
        <div className="badge-row">
          <PriorityBadge priority={incident.priority} label={incident.priorityLabel} />
          <StatusBadge status={incident.status} />
        </div>
        <ol className="workflow-stepper" aria-label="Incident workflow">
          {WORKFLOW_STEPS.map((step, index) => (
            <li
              key={step}
              className={index < currentWorkflowStep ? 'completed' : index === currentWorkflowStep ? 'current' : ''}
              aria-current={index === currentWorkflowStep ? 'step' : undefined}
            >
              {STATUS_LABELS[step]}
            </li>
          ))}
        </ol>
        <dl className="meta-grid">
          {meta.map((item) => (
            <div key={item.label} className="meta-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="card glass">
        <h2>Description</h2>
        <p className="description">{incident.description}</p>
      </section>

      {canChangeStatus && (
        allowedTransitions.length > 0 ? (
          <section className="card glass status-change-panel">
            <h2>Change Status</h2>
            <form onSubmit={handleStatusSubmit}>
              <label className="status-change-field">
                <span>New status</span>
                <select
                  className="control"
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                  required
                >
                  <option value="" disabled>Select a status</option>
                  {allowedTransitions.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </label>
              <label className="status-change-field">
                <span>Reason <span className="text-muted">(optional)</span></span>
                <input
                  className="control"
                  type="text"
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              {statusError && <div className="alert alert-error" role="alert">{statusError}</div>}
              <div className="status-change-actions">
                <button className="btn btn-primary" type="submit" disabled={statusSubmitting || !newStatus}>
                  {statusSubmitting ? <><Spinner size={15} /> Updating…</> : 'Update Status'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <p className="no-transitions">No further transitions available</p>
        )
      )}

      <div className="detail-columns">
        <section className="card glass placeholder">
          <h2>Comments</h2>
          <p className="text-muted">Coming soon</p>
        </section>
        <section className="card glass placeholder">
          <h2>Timeline</h2>
          <p className="text-muted">Coming soon</p>
        </section>
      </div>
    </div>
  )
}
