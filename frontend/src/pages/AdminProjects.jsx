import { useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { getAllDepartments } from '../api/departmentApi'
import { getAllProjects } from '../api/projectApi'
import Spinner from '../components/Spinner'
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from '../constants/roles'
import { formatDate } from '../utils/format'

const COLUMN_COUNT = 7

const STATUS_BADGE_CLASS = {
  ACTIVE: 'status-in_progress',
  ON_HOLD: 'status-on_hold',
  COMPLETED: 'status-resolved',
}

const STATS = [
  { label: 'Total projects', key: 'total', tone: 'info' },
  { label: 'Active', key: 'ACTIVE', tone: 'accent' },
  { label: 'On Hold', key: 'ON_HOLD', tone: 'danger' },
  { label: 'Completed', key: 'COMPLETED', tone: 'success' },
]

export default function AdminProjects() {
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [allDepartments, setAllDepartments] = useState([])

  useEffect(() => {
    let ignore = false
    getAllDepartments()
      .then((list) => {
        if (!ignore) setAllDepartments(list)
      })
      .catch(() => {
        // The filter falls back to the departments that appear in the project list
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  useEffect(() => {
    let ignore = false
    getAllProjects()
      .then((data) => {
        if (!ignore) setResult({ key: reloadCount, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: reloadCount, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const loading = result.key !== reloadCount
  const loadError = loading ? null : result.error
  const projects = useMemo(() => result.data ?? [], [result.data])

  const departments = useMemo(() => {
    const byId = new Map(allDepartments.map((d) => [d.id, d.name]))
    projects.forEach((p) => {
      if (!byId.has(p.departmentId)) byId.set(p.departmentId, p.departmentName ?? 'Unknown department')
    })
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [allDepartments, projects])

  const counts = useMemo(() => {
    const totals = { total: projects.length, ACTIVE: 0, ON_HOLD: 0, COMPLETED: 0 }
    projects.forEach((p) => {
      totals[p.status] += 1
    })
    return totals
  }, [projects])

  const visibleProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return projects.filter(
      (p) =>
        (!departmentFilter || p.departmentId === departmentFilter) &&
        (!statusFilter || p.status === statusFilter) &&
        (!keyword || p.name.toLowerCase().includes(keyword)),
    )
  }, [projects, departmentFilter, statusFilter, search])

  const hasFilters = Boolean(departmentFilter || statusFilter || search)

  const clearFilters = () => {
    setDepartmentFilter('')
    setStatusFilter('')
    setSearch('')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">Every project across all departments, with its Lead, team and status.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setReloadCount((count) => count + 1)}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      <section className="stat-grid" aria-label="Project statistics">
        {STATS.map((stat) => (
          <div key={stat.key} className={`stat-card glass tone-${stat.tone}`}>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{loading && !result.data ? '—' : counts[stat.key]}</span>
          </div>
        ))}
      </section>

      <div className="filter-bar glass">
        <input
          className="control filter-search"
          type="search"
          placeholder="Search projects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search projects by name"
        />
        <select
          className="control"
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROJECT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {loadError ? (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      ) : (
        <div className="table-card glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Department</th>
                <th>Lead</th>
                <th>Assigned employees</th>
                <th>Tasks</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && projects.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    <Spinner size={20} label="Loading projects" />
                  </td>
                </tr>
              )}
              {!loading && visibleProjects.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    {projects.length === 0
                      ? 'No projects yet. Leads create projects from their My Team page.'
                      : 'No projects match these filters.'}
                  </td>
                </tr>
              )}
              {visibleProjects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="cell-muted">{p.departmentName ?? 'Unknown department'}</td>
                  <td>{p.leads.length > 0 ? p.leads.join(', ') : <span className="text-muted">No Lead</span>}</td>
                  <td>
                    {p.employees.length > 0 ? (
                      <div className="chips" title={`${p.employees.length} assigned`}>
                        {p.employees.map((name, index) => (
                          <span key={`${name}-${index}`} className="chip">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    {p.taskCount > 0 ? (
                      <div className="task-progress" title={`${p.completedTaskCount} of ${p.taskCount} tasks completed`}>
                        <span>
                          {p.completedTaskCount}/{p.taskCount} done
                        </span>
                        <span className="task-progress-bar" aria-hidden="true">
                          <span style={{ width: `${(p.completedTaskCount / p.taskCount) * 100}%` }} />
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted">No tasks</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE_CLASS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="cell-muted">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <p className="text-muted table-footnote">
          Showing {visibleProjects.length} of {projects.length} projects
        </p>
      )}
    </div>
  )
}
