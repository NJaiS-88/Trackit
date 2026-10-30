import { useEffect, useState } from 'react'
import { approveAccountRequest, getAccountRequests, rejectAccountRequest } from '../api/accountRequestApi'
import { parseApiError } from '../api/axiosInstance'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import { ACCOUNT_REQUEST_STATUS_LABELS, ACCOUNT_REQUEST_STATUSES } from '../constants/roles'
import { formatDate } from '../utils/format'

const PAGE_SIZE = 20
const COLUMN_COUNT = 6

const STATUS_BADGE_CLASS = {
  PENDING: 'status-on_hold',
  APPROVED: 'status-resolved',
  REJECTED: 'status-rejected',
}

export default function AccountRequests() {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const requestKey = `${status}:${page}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getAccountRequests({ status, page, size: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: requestKey, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [requestKey, status, page])

  const loading = result.key !== requestKey
  const data = result.data
  const loadError = loading ? null : result.error

  const replaceRequest = (updated) => {
    setResult((prev) => ({
      ...prev,
      data: { ...prev.data, content: prev.data.content.map((r) => (r.id === updated.id ? updated : r)) },
    }))
  }

  const runAction = async (target, action, successMessage) => {
    setActionError(null)
    setActionMessage(null)
    setPendingIds((prev) => new Set(prev).add(target.id))
    try {
      replaceRequest(await action())
      setActionMessage(successMessage)
    } catch (error) {
      setActionError(parseApiError(error).message)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(target.id)
        return next
      })
    }
  }

  const handleApprove = (target) => {
    if (!window.confirm(`Approve ${target.name} (${target.email}) as an Employee?`)) return
    runAction(
      target,
      () => approveAccountRequest(target.id),
      `${target.name} can now sign in. Change their role from Admin Users if needed.`,
    )
  }

  const handleReject = (target) => {
    if (!window.confirm(`Reject the account request from ${target.name} (${target.email})?`)) return
    runAction(target, () => rejectAccountRequest(target.id), `Rejected the request from ${target.name}.`)
  }

  const handleStatusChange = (event) => {
    setStatus(event.target.value)
    setPage(0)
    setActionError(null)
    setActionMessage(null)
  }

  const requests = data?.content ?? []
  const pageInfo = data?.page

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Account Requests</h1>
          <p className="text-muted">Approve or reject people asking for a Trackit account.</p>
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

      <div className="filter-bar glass">
        <select className="control" value={status} onChange={handleStatusChange} aria-label="Filter by status">
          {ACCOUNT_REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ACCOUNT_REQUEST_STATUS_LABELS[value]}
            </option>
          ))}
          <option value="">All requests</option>
        </select>
      </div>

      {actionMessage && (
        <div className="alert alert-success" role="status">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      {loadError ? (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      ) : (
        <div className="table-card glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Reviewed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    <Spinner size={20} label="Loading account requests" />
                  </td>
                </tr>
              )}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    {status === 'PENDING' ? 'No requests waiting for approval.' : 'No account requests found.'}
                  </td>
                </tr>
              )}
              {requests.map((r) => {
                const pending = pendingIds.has(r.id)
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="cell-muted">{r.email}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE_CLASS[r.status]}`}>
                        {ACCOUNT_REQUEST_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="cell-muted">{formatDate(r.createdAt)}</td>
                    <td className="cell-muted">{r.reviewedAt ? formatDate(r.reviewedAt) : '—'}</td>
                    <td className="cell-actions">
                      {r.status === 'PENDING' && (
                        <div className="action-group">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(r)}
                            disabled={pending}
                          >
                            {pending ? 'Saving…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(r)}
                            disabled={pending}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageInfo && (
        <Pagination
          page={pageInfo.number}
          totalPages={pageInfo.totalPages}
          totalElements={pageInfo.totalElements}
          onPageChange={setPage}
          disabled={loading}
        />
      )}
    </div>
  )
}
