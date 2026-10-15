import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getIncidents } from '../api/incidentApi'
import IncidentTable from '../components/IncidentTable'
import { useAuth } from '../hooks/useAuth'

const WELCOME_TEXT = {
  EMPLOYEE: 'Report issues and follow the incidents you raised.',
  ENGINEER: 'Here are the incidents assigned to you.',
  ADMIN: 'Overview of all incidents across the organisation.',
}

// Real counts arrive with the dashboard API in Feature 10
const STATS = [
  { label: 'Open', value: 0, tone: 'info' },
  { label: 'In Progress', value: 0, tone: 'accent' },
  { label: 'Resolved', value: 0, tone: 'success' },
  { label: 'SLA Breached', value: 0, tone: 'danger' },
]

export default function Dashboard() {
  const { user, role } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false
    getIncidents({ page: 0, size: 5 })
      .then((data) => {
        if (!ignore) setIncidents(data.content)
      })
      .catch((err) => {
        if (!ignore) setError(parseApiError(err).message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-muted">{WELCOME_TEXT[role]}</p>
        </div>
        {role === 'EMPLOYEE' && (
          <Link to="/incidents/new" className="btn btn-primary">
            ＋ New Incident
          </Link>
        )}
      </div>

      <section className="stat-grid" aria-label="Incident statistics">
        {STATS.map((stat) => (
          <div key={stat.label} className={`stat-card glass tone-${stat.tone}`}>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Recent incidents</h2>
          <Link to="/incidents">View all →</Link>
        </div>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : (
          <IncidentTable incidents={incidents} loading={loading} emptyMessage="No incidents yet." />
        )}
      </section>
    </div>
  )
}
