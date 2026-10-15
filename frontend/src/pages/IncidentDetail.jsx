import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getIncidentById } from '../api/incidentApi'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { CATEGORY_LABELS, LEVEL_LABELS } from '../constants/incident'
import { formatDateTime } from '../utils/format'

const ERROR_MESSAGES = {
  403: "You don't have access to this incident.",
  404: 'This incident does not exist or has been deleted.',
}

export default function IncidentDetail() {
  const { id } = useParams()
  const [state, setState] = useState({ incident: null, error: null, loading: true, forId: id })

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
    { label: 'Category', value: CATEGORY_LABELS[incident.category] ?? incident.category },
    { label: 'Affected Service', value: incident.affectedService ?? '—' },
    { label: 'Impact', value: LEVEL_LABELS[incident.impact] ?? incident.impact },
    { label: 'Urgency', value: LEVEL_LABELS[incident.urgency] ?? incident.urgency },
    { label: 'Created At', value: formatDateTime(incident.createdAt) },
  ]

  return (
    <div className="page page-narrow">
      <Link to="/incidents" className="back-link">
        ← Back to incidents
      </Link>

      <header className="detail-header card glass">
        <span className="detail-number">{incident.incidentNumber}</span>
        <h1>{incident.title}</h1>
        <div className="badge-row">
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </div>
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
