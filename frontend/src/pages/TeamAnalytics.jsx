import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeamAnalytics } from '../api/analyticsApi'
import { parseApiError } from '../api/axiosInstance'
import { BarList, Kpi, ProgressBar, RangeSwitch, TrendChart } from '../components/AnalyticsWidgets'
import Spinner from '../components/Spinner'
import Timestamp from '../components/Timestamp'
import { PRIORITIES, PRIORITY_LABELS } from '../constants/incident'
import { PROJECT_STATUS_LABELS } from '../constants/roles'
import { formatDuration, formatPercent as percent, rateTone } from '../utils/analytics'

const PROJECT_BADGE_CLASS = {
  ACTIVE: 'status-in_progress',
  ON_HOLD: 'status-on_hold',
  COMPLETED: 'status-resolved',
}

export default function TeamAnalytics() {
  const [days, setDays] = useState(30)
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const requestKey = `${days}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getTeamAnalytics(days)
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult((prev) => ({ key: requestKey, data: prev.data, error: parseApiError(err).message }))
      })
    return () => {
      ignore = true
    }
  }, [requestKey, days])

  const loading = result.key !== requestKey
  const data = result.data
  const overview = data?.overview
  const rangeLabel = `last ${days} days`

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Team Analytics</h1>
          <p className="text-muted">
            {overview
              ? `Ticket, SLA and delivery performance for the ${overview.departmentName} department.`
              : 'Ticket, SLA and delivery performance for your department.'}
          </p>
        </div>
        <div className="analytics-controls">
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
          <Spinner size={28} label="Loading team analytics" />
        </div>
      )}

      {data && overview && (
        <div className={loading ? 'row-stale' : undefined}>
          <section className="kpi-grid" aria-label="Key figures">
            <Kpi
              label="Open tickets"
              value={overview.incidents.open}
              detail={`${overview.incidents.openBreached} past their SLA deadline`}
              tone={overview.incidents.openBreached > 0 ? 'kpi-bad' : ''}
              to="/team/work"
            />
            <Kpi
              label="SLA compliance"
              value={percent(overview.incidents.slaCompliancePercent)}
              detail={
                overview.incidents.slaCompliancePercent == null
                  ? `No tickets resolved in the ${rangeLabel}`
                  : `${overview.incidents.slaMetInRange} met · ${overview.incidents.slaBreachedInRange} breached, ${rangeLabel}`
              }
              tone={rateTone(overview.incidents.slaCompliancePercent)}
            />
            <Kpi
              label="Average resolution time"
              value={formatDuration(overview.incidents.avgResolutionHours)}
              detail={`${overview.incidents.resolvedInRange} resolved · ${overview.incidents.createdInRange} raised, ${rangeLabel}`}
            />
            <Kpi
              label="Overdue work"
              value={overview.work.overdue}
              detail={`of ${overview.work.assigned + overview.work.inProgress + overview.work.declined} open work items`}
              tone={overview.work.overdue > 0 ? 'kpi-bad' : 'kpi-good'}
              to="/team/work"
            />
            <Kpi
              label="On-time delivery"
              value={percent(overview.work.onTimePercent)}
              detail={
                overview.work.onTimePercent == null
                  ? `No work with a deadline completed in the ${rangeLabel}`
                  : `${overview.work.completedInRange} completed · ${overview.work.assignedInRange} assigned, ${rangeLabel}`
              }
              tone={rateTone(overview.work.onTimePercent)}
            />
            <Kpi
              label="Team"
              value={`${overview.people.employees} ${overview.people.employees === 1 ? 'employee' : 'employees'}`}
              detail={`${overview.projects.active} active · ${overview.projects.onHold} on hold · ${overview.projects.completed} completed projects`}
              to="/team"
            />
          </section>

          <section className="card glass analytics-card">
            <div className="analytics-card-header">
              <h2>Ticket trend</h2>
              <span className="text-muted">{rangeLabel}</span>
            </div>
            <TrendChart points={overview.trend} />
          </section>

          <div className="analytics-columns analytics-columns-2">
            <section className="card glass analytics-card">
              <div className="analytics-card-header">
                <h2>Open tickets by priority</h2>
              </div>
              <BarList
                rows={PRIORITIES.map((p) => ({
                  label: `${p} · ${PRIORITY_LABELS[p]}`,
                  value: overview.incidents.openByPriority[p] ?? 0,
                  tone: `fill-${p.toLowerCase()}`,
                }))}
              />
            </section>

            <section className="card glass analytics-card">
              <div className="analytics-card-header">
                <h2>Work status</h2>
                <Link to="/team/work">Work Assignments →</Link>
              </div>
              <BarList
                rows={[
                  { label: 'Assigned', value: overview.work.assigned, tone: 'fill-info' },
                  { label: 'In progress', value: overview.work.inProgress, tone: 'fill-accent' },
                  { label: "Can't do", value: overview.work.declined, tone: 'fill-warn' },
                  { label: 'Overdue', value: overview.work.overdue, tone: 'fill-danger' },
                  { label: `Completed (${days}d)`, value: overview.work.completedInRange, tone: 'fill-success' },
                ]}
              />
            </section>
          </div>

          <section className="section">
            <div className="section-header">
              <h2>Employee performance</h2>
              <span className="text-muted section-meta">Completed, on-time and average time cover the {rangeLabel}</span>
            </div>
            <div className="table-card table-fit glass">
              <table className="data-table">
                <colgroup>
                  <col className="col-wide" />
                  <col span={8} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Assigned</th>
                    <th>In progress</th>
                    <th>Overdue</th>
                    <th>Can&apos;t do</th>
                    <th>Completed</th>
                    <th>On time</th>
                    <th>Avg. time to complete</th>
                    <th>Workload</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        No employees in your department yet.
                      </td>
                    </tr>
                  )}
                  {data.employees.map((e) => {
                    const open = e.assigned + e.inProgress
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="cell-title">{e.name}</div>
                          <div className="cell-sub">{e.projectName ?? 'No project'}</div>
                        </td>
                        <td>{e.assigned}</td>
                        <td>{e.inProgress}</td>
                        <td className={e.overdue > 0 ? 'cell-danger' : undefined}>{e.overdue}</td>
                        <td className={e.declined > 0 ? 'kpi-warn' : undefined}>{e.declined}</td>
                        <td>{e.completedInRange}</td>
                        <td className={rateTone(e.onTimePercent)}>{percent(e.onTimePercent)}</td>
                        <td>{formatDuration(e.avgCompletionHours)}</td>
                        <td>
                          <span className={`workload workload-${open === 0 ? 'free' : open <= 3 ? 'normal' : 'heavy'}`}>
                            {open === 0 ? 'Available' : open <= 3 ? `${open} open` : `${open} open · heavy`}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2>Project progress</h2>
              <Link to="/team">Manage projects →</Link>
            </div>
            <div className="table-card table-fit glass">
              <table className="data-table">
                <colgroup>
                  <col className="col-wide" />
                  <col />
                  <col />
                  <col className="col-progress" />
                  <col span={3} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Team</th>
                    <th>Progress</th>
                    <th>Open tasks</th>
                    <th>Overdue</th>
                    <th>Next deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        No projects yet. <Link to="/team">Create one</Link> on My Team.
                      </td>
                    </tr>
                  )}
                  {data.projects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-title">{p.name}</div>
                        <div className="cell-sub">
                          {p.completed} of {p.tasks} {p.tasks === 1 ? 'task' : 'tasks'} done
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${PROJECT_BADGE_CLASS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                      </td>
                      <td>{p.members}</td>
                      <td>
                        <ProgressBar value={p.completionPercent} />
                      </td>
                      <td>{p.open}</td>
                      <td className={p.overdue > 0 ? 'cell-danger' : undefined}>{p.overdue}</td>
                      <td className="cell-muted">
                        <Timestamp value={p.nextDeadline} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-muted table-footnote analytics-generated">
            Generated <Timestamp value={overview.generatedAt} />
          </p>
        </div>
      )}
    </div>
  )
}
