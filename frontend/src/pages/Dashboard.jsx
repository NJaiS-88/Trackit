import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getDashboardSummary, getIncidents } from '../api/incidentApi'
import IncidentTable from '../components/IncidentTable'
import { useAuth } from '../hooks/useAuth'

const WELCOME_TEXT = {
  EMPLOYEE: 'Report issues and follow the incidents you raised.',
  ENGINEER: 'Here are the incidents assigned to you.',
  ADMIN: 'Overview of all incidents across the organisation.',
}

const STATS = [
  { label: 'Open', key: 'open', tone: 'info' },
  { label: 'In Progress', key: 'inProgress', tone: 'accent' },
  { label: 'Resolved', key: 'resolved', tone: 'success' },
  { label: 'SLA Breached', key: 'slaBreached', tone: 'danger' },
]

export default function Dashboard() {
  const { user, role } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false
    Promise.all([getIncidents({ page: 0, size: 5 }), getDashboardSummary()])
      .then(([incidentPage, dashboardSummary]) => {
        if (ignore) return
        setIncidents(incidentPage.content)
        setSummary(dashboardSummary)
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
            <span className="stat-value">{summary?.[stat.key] ?? '—'}</span>
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
