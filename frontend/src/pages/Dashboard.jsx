import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../api/authApi'
import { parseApiError } from '../api/axiosInstance'
import { getDashboardSummary, getIncidents } from '../api/incidentApi'
import { getAllWork, getTeamWork } from '../api/workApi'
import IncidentTable from '../components/IncidentTable'
import MyWork from '../components/MyWork'
import WorkSummary from '../components/WorkSummary'
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
  // Re-read on every visit so a department or project assigned meanwhile shows without signing in again
  const [profile, setProfile] = useState({
    loaded: false,
    departmentName: user.departmentName ?? null,
    projectName: user.projectName ?? null,
  })
  const showDepartment = role !== 'ADMIN'

  useEffect(() => {
    if (!showDepartment) return undefined
    let ignore = false
    getCurrentUser()
      .then((freshUser) => {
        if (ignore) return
        setProfile({
          loaded: true,
          departmentName: freshUser.departmentName ?? null,
          projectName: freshUser.projectName ?? null,
        })
      })
      .catch(() => {
        if (!ignore) setProfile((prev) => ({ ...prev, loaded: true }))
      })
    return () => {
      ignore = true
    }
  }, [showDepartment])

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
            New Incident
          </Link>
        )}
      </div>

      {showDepartment && (
        <section className="department-card card glass" aria-label="Your department">
          <span className="stat-label">{role === 'ENGINEER' ? 'Your role' : 'Your department'}</span>
          {!profile.loaded && !profile.departmentName ? (
            <p className="text-muted">Loading…</p>
          ) : role === 'ENGINEER' ? (
            profile.departmentName ? (
              <>
                <p className="department-name">You are the Lead of the {profile.departmentName} department.</p>
                <p className="text-muted">
                  Go to <Link to="/team">My Team</Link> to assign projects to your employees, and{' '}
                  <Link to="/team/work">Work Assignments</Link> to assign tasks and tickets.
                </p>
              </>
            ) : (
              <p className="text-muted">You are a Lead, but you haven&apos;t been assigned to a department yet.</p>
            )
          ) : profile.departmentName ? (
            <>
              <p className="department-name">You have been assigned to the {profile.departmentName} department.</p>
              <p className="text-muted">
                {profile.projectName
                  ? `Project: ${profile.projectName}`
                  : "Your Lead hasn't assigned you to a project yet."}
              </p>
            </>
          ) : (
            <p className="text-muted">You haven&apos;t been assigned to a department yet.</p>
          )}
        </section>
      )}

      {role === 'EMPLOYEE' && <MyWork />}
      {role === 'ENGINEER' && (
        <WorkSummary title="Team work" load={getTeamWork} linkTo="/team/work" linkLabel="Work Assignments" />
      )}
      {role === 'ADMIN' && (
        <WorkSummary title="Work overview" load={getAllWork} linkTo="/admin/work" linkLabel="View all work" />
      )}

      <section className="section" aria-label="Incident statistics">
        <div className="section-header">
          <h2>Incidents</h2>
        </div>
        <div className="stat-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className={`stat-card glass tone-${stat.tone}`}>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{summary?.[stat.key] ?? '—'}</span>
            </div>
          ))}
        </div>
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
