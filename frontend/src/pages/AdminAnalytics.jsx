import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../api/analyticsApi'
import { parseApiError } from '../api/axiosInstance'
import { getAllDepartments } from '../api/departmentApi'
import { BarList, Kpi, RangeSwitch, TrendChart } from '../components/AnalyticsWidgets'
import Spinner from '../components/Spinner'
import Timestamp from '../components/Timestamp'
import { PRIORITIES, PRIORITY_LABELS } from '../constants/incident'
import { formatDuration, formatPercent as percent, rateTone } from '../utils/analytics'

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState([])
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const requestKey = `${days}:${departmentId}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getAllDepartments()
      .then((list) => {
        if (!ignore) setDepartments(list)
      })
      .catch(() => {
        // The selector then only offers "All departments"; the analytics themselves still load
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  useEffect(() => {
    let ignore = false
    getAnalytics(days, departmentId || undefined)
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult((prev) => ({ key: requestKey, data: prev.data, error: parseApiError(err).message }))
      })
    return () => {
      ignore = true
    }
  }, [requestKey, days, departmentId])

  const loading = result.key !== requestKey
  const data = result.data
  const rangeLabel = `last ${days} days`
  const scoped = Boolean(data?.departmentId)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="text-muted">
            {scoped
              ? `Incident, SLA and delivery performance for the ${data.departmentName} department.`
              : 'Incident, SLA and delivery performance across the organisation.'}
          </p>
        </div>
        <div className="analytics-controls">
          <select
            className="control analytics-department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            disabled={loading}
            aria-label="Department"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <RangeSwitch value={days} onChange={setDays} disabled={loading} />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setReloadCount((count) => count + 1)}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {result.error && !loading && (
        <div className="alert alert-error" role="alert">
          {result.error}
        </div>
      )}

      {!data && loading && (
        <div className="page-center">
          <Spinner size={28} label="Loading analytics" />
        </div>
      )}

      {data && (
        <div className={loading ? 'row-stale' : undefined}>
          <section className="kpi-grid" aria-label="Key figures">
            <Kpi
              label="Open incidents"
              value={data.incidents.open}
              detail={`${data.incidents.openBreached} past their SLA deadline`}
              tone={data.incidents.openBreached > 0 ? 'kpi-bad' : ''}
              to="/incidents"
            />
            <Kpi
              label="SLA compliance"
              value={percent(data.incidents.slaCompliancePercent)}
              detail={
                data.incidents.slaCompliancePercent == null
                  ? `No incidents resolved in the ${rangeLabel}`
                  : `${data.incidents.slaMetInRange} met · ${data.incidents.slaBreachedInRange} breached, ${rangeLabel}`
              }
              tone={rateTone(data.incidents.slaCompliancePercent)}
            />
            <Kpi
              label="Average resolution time"
              value={formatDuration(data.incidents.avgResolutionHours)}
              detail={`${data.incidents.resolvedInRange} resolved · ${data.incidents.createdInRange} raised, ${rangeLabel}`}
            />
            <Kpi
              label="Overdue work"
              value={data.work.overdue}
              detail={`of ${data.work.assigned + data.work.inProgress + data.work.declined} open work items`}
              tone={data.work.overdue > 0 ? 'kpi-bad' : 'kpi-good'}
              to="/admin/work"
            />
            <Kpi
              label="On-time delivery"
              value={percent(data.work.onTimePercent)}
              detail={
                data.work.onTimePercent == null
                  ? `No work with a deadline completed in the ${rangeLabel}`
                  : `${data.work.completedInRange} completed · ${data.work.assignedInRange} assigned, ${rangeLabel}`
              }
              tone={rateTone(data.work.onTimePercent)}
            />
            {scoped ? (
              <Kpi
                label="Active projects"
                value={data.projects.active}
                detail={`${data.projects.onHold} on hold · ${data.projects.completed} completed`}
                to="/admin/projects"
              />
            ) : (
              <Kpi
                label="Pending account requests"
                value={data.people.pendingRequests}
                detail={data.people.pendingRequests > 0 ? 'Awaiting your approval' : 'Nothing to review'}
                tone={data.people.pendingRequests > 0 ? 'kpi-warn' : ''}
                to="/admin/requests"
              />
            )}
          </section>

          <section className="card glass analytics-card">
            <div className="analytics-card-header">
              <h2>Incident trend</h2>
              <span className="text-muted">{rangeLabel}</span>
            </div>
            <TrendChart points={data.trend} />
          </section>

          <div className="analytics-columns">
            <section className="card glass analytics-card">
              <div className="analytics-card-header">
                <h2>Open incidents by priority</h2>
              </div>
              <BarList
                rows={PRIORITIES.map((p) => ({
                  label: `${p} · ${PRIORITY_LABELS[p]}`,
                  value: data.incidents.openByPriority[p] ?? 0,
                  tone: `fill-${p.toLowerCase()}`,
                }))}
              />
            </section>

            <section className="card glass analytics-card">
              <div className="analytics-card-header">
                <h2>Work status</h2>
                <Link to="/admin/work">View work →</Link>
              </div>
              <BarList
                rows={[
                  { label: 'Assigned', value: data.work.assigned, tone: 'fill-info' },
                  { label: 'In progress', value: data.work.inProgress, tone: 'fill-accent' },
                  { label: "Can't do", value: data.work.declined, tone: 'fill-warn' },
                  { label: 'Overdue', value: data.work.overdue, tone: 'fill-danger' },
                  { label: `Completed (${days}d)`, value: data.work.completedInRange, tone: 'fill-success' },
                ]}
              />
            </section>

            <section className="card glass analytics-card">
              <div className="analytics-card-header">
                <h2>{scoped ? data.departmentName : 'Organisation'}</h2>
              </div>
              <dl className="org-summary">
                <div>
                  <dt>Projects</dt>
                  <dd>
                    {data.projects.active} active · {data.projects.onHold} on hold · {data.projects.completed}{' '}
                    completed
                  </dd>
                </div>
                <div>
                  <dt>People</dt>
                  <dd>
                    {data.people.employees} employees · {data.people.leads} Leads
                    {!scoped && ` · ${data.people.admins} admins`}
                  </dd>
                </div>
                <div>
                  <dt>Inactive accounts</dt>
                  <dd>{data.people.inactive}</dd>
                </div>
                {!scoped && (
                  <div>
                    <dt>Departments</dt>
                    <dd>{data.departments.length}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>

          <section className="section">
            <div className="section-header">
              <h2>Department performance</h2>
              <span className="text-muted section-meta">Completed and on-time figures cover the {rangeLabel}</span>
            </div>
            <div className="table-card table-fit glass">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Lead</th>
                    <th>Employees</th>
                    <th>Open tickets</th>
                    <th>Active projects</th>
                    <th>Open work</th>
                    <th>Overdue</th>
                    <th>Completed</th>
                    <th>On time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.length === 0 && (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        No departments yet. <Link to="/admin/departments">Create one</Link> to see its performance.
                      </td>
                    </tr>
                  )}
                  {data.departments.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-title">{d.name}</td>
                      <td className="cell-muted">{d.leads.length > 0 ? d.leads.join(', ') : 'No Lead'}</td>
                      <td>{d.employees}</td>
                      <td>{d.openTickets}</td>
                      <td>{d.activeProjects}</td>
                      <td>{d.openWork}</td>
                      <td className={d.overdueWork > 0 ? 'cell-danger' : undefined}>{d.overdueWork}</td>
                      <td>{d.completedInRange}</td>
                      <td className={rateTone(d.onTimePercent)}>{percent(d.onTimePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-muted table-footnote analytics-generated">
            Generated <Timestamp value={data.generatedAt} />
          </p>
        </div>
      )}
    </div>
  )
}
