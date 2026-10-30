import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { WORK_STATS, countByStatus } from '../constants/work'

/** Work counts by status for a dashboard; `load` returns the work items to count. */
export default function WorkSummary({ title, load, linkTo, linkLabel }) {
  const [state, setState] = useState({ counts: null, error: null })

  useEffect(() => {
    let ignore = false
    load()
      .then((items) => {
        if (!ignore) setState({ counts: countByStatus(items), error: null })
      })
      .catch((err) => {
        if (!ignore) setState({ counts: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [load])

  return (
    <section className="section" aria-label={title}>
      <div className="section-header">
        <h2>{title}</h2>
        <Link to={linkTo}>{linkLabel} →</Link>
      </div>
      {state.error ? (
        <div className="alert alert-error" role="alert">
          {state.error}
        </div>
      ) : (
        <div className="stat-grid">
          {WORK_STATS.map((stat) => (
            <div key={stat.key} className={`stat-card glass tone-${stat.tone}`}>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{state.counts ? state.counts[stat.key] : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
