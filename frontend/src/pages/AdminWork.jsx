import { useEffect, useMemo, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { getAllDepartments } from '../api/departmentApi'
import { getAllWork } from '../api/workApi'
import AttachmentList from '../components/AttachmentList'
import DueDate from '../components/DueDate'
import Pagination from '../components/Pagination'
import { useNow } from '../hooks/useNow'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import WorkStatusBadge from '../components/WorkStatusBadge'
import {
  WORK_STATS,
  WORK_STATUS_LABELS,
  WORK_STATUSES,
  WORK_TYPE_LABELS,
  WORK_TYPES,
  countByStatus,
  workSource,
} from '../constants/work'
import Timestamp from '../components/Timestamp'

const COLUMN_COUNT = 8
const PAGE_SIZE = 10

export default function AdminWork() {
  const now = useNow()
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [allDepartments, setAllDepartments] = useState([])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let ignore = false
    getAllWork()
      .then((data) => {
        if (!ignore) setResult({ key: reloadCount, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: reloadCount, data: null, error: parseApiError(err).message })
      })
    getAllDepartments()
      .then((list) => {
        if (!ignore) setAllDepartments(list)
      })
      .catch(() => {
        // The filter falls back to the departments that appear in the work list
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const loading = result.key !== reloadCount
  const loadError = loading ? null : result.error
  const work = useMemo(() => result.data ?? [], [result.data])
  const counts = countByStatus(work)

  const departments = useMemo(() => {
    const byId = new Map(allDepartments.map((d) => [d.id, d.name]))
    work.forEach((w) => {
      if (!byId.has(w.departmentId)) byId.set(w.departmentId, w.departmentName ?? 'Unknown department')
    })
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [allDepartments, work])

  const visibleWork = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return work.filter(
      (w) =>
        (!departmentFilter || w.departmentId === departmentFilter) &&
        (!statusFilter || w.status === statusFilter) &&
        (!typeFilter || w.type === typeFilter) &&
        (!keyword ||
          w.title.toLowerCase().includes(keyword) ||
          (w.assigneeName ?? '').toLowerCase().includes(keyword) ||
          (w.assignedByName ?? '').toLowerCase().includes(keyword) ||
          workSource(w).toLowerCase().includes(keyword)),
    )
  }, [work, departmentFilter, statusFilter, typeFilter, search])

  const totalPages = Math.max(Math.ceil(visibleWork.length / PAGE_SIZE), 1)
  // Stay in range when a refresh or filter leaves fewer pages than before
  const currentPage = Math.min(page, totalPages - 1)
  const pageWork = visibleWork.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  /** Wraps a filter setter so any filter change starts again from the first page. */
  const filterChange = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  const hasFilters = Boolean(departmentFilter || statusFilter || typeFilter || search)
  const clearFilters = () => {
    setDepartmentFilter('')
    setStatusFilter('')
    setTypeFilter('')
    setSearch('')
    setPage(0)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Work Overview</h1>
          <p className="text-muted">
            Every project task and ticket that Leads have assigned, across all departments.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setReloadCount((count) => count + 1)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <section className="stat-grid" aria-label="Work statistics">
        {WORK_STATS.map((stat) => (
          <div key={stat.key} className={`stat-card glass tone-${stat.tone}`}>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{result.data ? counts[stat.key] : '—'}</span>
          </div>
        ))}
      </section>

      <div className="filter-bar glass">
        <input
          className="control filter-search"
          type="search"
          placeholder="Search by title, employee, Lead, project or ticket"
          value={search}
          onChange={filterChange(setSearch)}
          aria-label="Search work"
        />
        <select
          className="control"
          value={departmentFilter}
          onChange={filterChange(setDepartmentFilter)}
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
          onChange={filterChange(setStatusFilter)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {WORK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WORK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={typeFilter}
          onChange={filterChange(setTypeFilter)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {WORK_TYPES.map((t) => (
            <option key={t} value={t}>
              {WORK_TYPE_LABELS[t]}
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
        <div className="table-card table-fit glass">
          <table className="data-table">
            <colgroup>
              <col className="col-work" />
              <col span={COLUMN_COUNT - 1} />
            </colgroup>
            <thead>
              <tr>
                <th>Work</th>
                <th>Department</th>
                <th>Assigned to</th>
                <th>Assigned by</th>
                <th>Assigned</th>
                <th>Status</th>
                <th>Due</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && !result.data && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    <Spinner size={20} label="Loading work" />
                  </td>
                </tr>
              )}
              {result.data && visibleWork.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    {work.length === 0
                      ? 'No work has been assigned yet. Leads assign it from their Work Assignments page.'
                      : 'No work matches these filters.'}
                  </td>
                </tr>
              )}
              {pageWork.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div className="cell-title">{w.title}</div>
                    <div className="cell-sub">
                      {WORK_TYPE_LABELS[w.type]} · {workSource(w)}
                      {w.priority && (
                        <>
                          {' '}
                          <PriorityBadge priority={w.priority} />
                        </>
                      )}
                    </div>
                    <AttachmentList attachments={w.attachments} />
                  </td>
                  <td className="cell-muted">{w.departmentName ?? '—'}</td>
                  <td>{w.assigneeName ?? '—'}</td>
                  <td className="cell-muted">{w.assignedByName ?? '—'}</td>
                  <td className="cell-muted">
                    <Timestamp value={w.assignedAt} />
                  </td>
                  <td>
                    <WorkStatusBadge status={w.status} />
                    {w.status === 'DECLINED' && w.declineReason && (
                      <div className="decline-reason">“{w.declineReason}”</div>
                    )}
                  </td>
                  <td className="cell-muted">
                    <DueDate item={w} now={now} />
                  </td>
                  <td className="cell-muted">
                    <Timestamp value={w.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.data && visibleWork.length > 0 && (
        <>
          <p className="text-muted table-footnote">
            Showing {pageWork.length} of {visibleWork.length} work items
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalElements={visibleWork.length}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}
    </div>
  )
}
