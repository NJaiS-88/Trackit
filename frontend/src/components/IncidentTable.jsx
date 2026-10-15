import { useNavigate } from 'react-router-dom'
import { CATEGORY_LABELS } from '../constants/incident'
import { formatDateTime } from '../utils/format'
import PriorityBadge from './PriorityBadge'
import Spinner from './Spinner'
import StatusBadge from './StatusBadge'

const COLUMN_COUNT = 6

/** Rows navigate to /incidents/{id} unless `onRowClick` is provided. */
export default function IncidentTable({ incidents, loading, onRowClick, emptyMessage = 'No incidents found.' }) {
  const navigate = useNavigate()
  const openIncident = onRowClick ?? ((incident) => navigate(`/incidents/${incident.id}`))

  const handleKeyDown = (event, incident) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openIncident(incident)
    }
  }

  return (
    <div className="table-card glass">
      <table className="data-table">
        <thead>
          <tr>
            <th>Incident #</th>
            <th>Title</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {loading && incidents.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="table-empty">
                <Spinner size={20} label="Loading incidents" />
              </td>
            </tr>
          )}
          {!loading && incidents.length === 0 && (
            <tr>
              <td colSpan={COLUMN_COUNT} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className={`row-clickable ${loading ? 'row-stale' : ''}`}
              onClick={() => openIncident(incident)}
              onKeyDown={(event) => handleKeyDown(event, incident)}
              tabIndex={0}
              role="link"
              aria-label={`Open ${incident.incidentNumber}: ${incident.title}`}
            >
              <td className="cell-mono">{incident.incidentNumber}</td>
              <td className="cell-title">{incident.title}</td>
              <td>{CATEGORY_LABELS[incident.category] ?? incident.category}</td>
              <td>
                <PriorityBadge priority={incident.priority} />
              </td>
              <td>
                <StatusBadge status={incident.status} />
              </td>
              <td className="cell-muted">{formatDateTime(incident.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
