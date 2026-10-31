import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../api/analyticsApi'
import { parseApiError } from '../api/axiosInstance'
import Spinner from '../components/Spinner'
import Timestamp from '../components/Timestamp'
import { PRIORITIES, PRIORITY_LABELS } from '../constants/incident'
import { formatDay } from '../utils/format'

const RANGES = [7, 30, 90]

const percent = (value) => (value == null ? '—' : `${value}%`)

/** Hours under two days, days beyond that. */
function formatDuration(hours) {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

/** Colour a rate: green at target, amber close to it, red below. */
function rateTone(value, target = 90) {
  if (value == null) return ''
  if (value >= target) return 'kpi-good'
  if (value >= target - 15) return 'kpi-warn'
  return 'kpi-bad'
}

function Kpi({ label, value, detail, tone = '', to }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone}`}>{value}</span>
      <span className="kpi-detail">{detail}</span>
    </>
  )
  return to ? (
    <Link to={to} className="kpi-card glass kpi-link">
      {body}
    </Link>
  ) : (
    <div className="kpi-card glass">{body}</div>
  )
}

/** Horizontal bars; `rows` are `{ label, value, tone }`. */
function BarList({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="bar-list">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="bar-list-label">{row.label}</span>
          <span className="bar-list-track" aria-hidden="true">
            <span className={`bar-list-fill ${row.tone ?? ''}`} style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="bar-list-value">{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

function TrendChart({ points }) {
  const max = Math.max(...points.flatMap((p) => [p.created, p.resolved]), 1)
  // Keep the axis readable: roughly 7 labels whatever the number of bars
  const labelEvery = Math.max(Math.ceil(points.length / 7), 1)
  const weekly = points.length > 0 && points[0].days > 1

  return (
    <div className="trend">
      <div className="trend-legend">
        <span>
          <span className="legend-swatch swatch-created" /> Raised
        </span>
        <span>
          <span className="legend-swatch swatch-resolved" /> Resolved
        </span>
        <span className="text-muted">{weekly ? 'Per week' : 'Per day'}</span>
      </div>
      <div className="trend-chart" role="img" aria-label="Incidents raised and resolved over time">
        {points.map((p, index) => (
          <div
            key={p.start}
            className="trend-group"
            title={`${weekly ? 'Week of ' : ''}${formatDay(p.start)}: ${p.created} raised, ${p.resolved} resolved`}
          >
            <div className="trend-bars">
              <span className="trend-bar swatch-created" style={{ height: `${(p.created / max) * 100}%` }} />
              <span className="trend-bar swatch-resolved" style={{ height: `${(p.resolved / max) * 100}%` }} />
            </div>
            <span className="trend-label">{index % labelEvery === 0 ? formatDay(p.start).replace(/,? \d{4}$/, '') : ''}</span>
          </div>
        ))}
      </div>
      <p className="trend-axis text-muted">Peak: {max} per {weekly ? 'week' : 'day'}</p>
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const requestKey = `${days}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getAnalytics(days)
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
  const rangeLabel = `last ${days} days`

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="text-muted">Incident, SLA and delivery performance across the organisation.</p>
        </div>
        <div className="analytics-controls">
          <div className="segmented" role="group" aria-label="Time range">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={range === days ? 'active' : undefined}
                aria-pressed={range === days}
                onClick={() => setDays(range)}
                disabled={loading}
              >
                {range} days
              </button>
            ))}
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
            <Kpi
              label="Pending account requests"
              value={data.people.pendingRequests}
              detail={data.people.pendingRequests > 0 ? 'Awaiting your approval' : 'Nothing to review'}
              tone={data.people.pendingRequests > 0 ? 'kpi-warn' : ''}
              to="/admin/requests"
            />
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
                <h2>Organisation</h2>
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
                    {data.people.employees} employees · {data.people.leads} Leads · {data.people.admins} admins
                  </dd>
                </div>
                <div>
                  <dt>Inactive accounts</dt>
                  <dd>{data.people.inactive}</dd>
                </div>
                <div>
                  <dt>Departments</dt>
                  <dd>{data.departments.length}</dd>
                </div>
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
