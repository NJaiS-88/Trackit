import { Link } from 'react-router-dom'
import { ANALYTICS_RANGES } from '../utils/analytics'
import { formatDay } from '../utils/format'

/** Headline figure; links to the page behind it when `to` is given. */
export function Kpi({ label, value, detail, tone = '', to }) {
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
export function BarList({ rows }) {
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

/** Incidents raised vs resolved per day (or per week for long ranges). */
export function TrendChart({ points }) {
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
            <span className="trend-label">
              {index % labelEvery === 0 ? formatDay(p.start).replace(/,? \d{4}$/, '') : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="trend-axis text-muted">
        Peak: {max} per {weekly ? 'week' : 'day'}
      </p>
    </div>
  )
}

/** 7 / 30 / 90 days switch. */
export function RangeSwitch({ value, onChange, disabled }) {
  return (
    <div className="segmented" role="group" aria-label="Time range">
      {ANALYTICS_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          className={range === value ? 'active' : undefined}
          aria-pressed={range === value}
          onClick={() => onChange(range)}
          disabled={disabled}
        >
          {range} days
        </button>
      ))}
    </div>
  )
}

/** Thin progress bar with its percentage. */
export function ProgressBar({ value }) {
  if (value == null) return <span className="text-muted">No tasks</span>
  return (
    <div className="progress" title={`${value}% complete`}>
      <span className="progress-track" aria-hidden="true">
        <span className="progress-fill" style={{ width: `${value}%` }} />
      </span>
      <span className="progress-value">{value}%</span>
    </div>
  )
}
