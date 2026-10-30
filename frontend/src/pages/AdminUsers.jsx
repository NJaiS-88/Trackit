import { useEffect, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { getAllDepartments } from '../api/departmentApi'
import { getUsers, toggleUserStatus, updateUserDepartment, updateUserRole } from '../api/userApi'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import { ROLE_LABELS, ROLES } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../utils/format'

const PAGE_SIZE = 20
const COLUMN_COUNT = 7

export default function AdminUsers() {
  const { user: currentUser } = useAuth()

  const [page, setPage] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [actionError, setActionError] = useState(null)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [departments, setDepartments] = useState({ key: null, list: [], error: null })
  const requestKey = `${page}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getUsers({ page, size: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: requestKey, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [requestKey, page])

  useEffect(() => {
    let ignore = false
    getAllDepartments()
      .then((list) => {
        if (!ignore) setDepartments({ key: reloadCount, list, error: null })
      })
      .catch((err) => {
        if (!ignore) setDepartments({ key: reloadCount, list: [], error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const departmentsLoading = departments.key !== reloadCount
  const departmentIds = new Set(departments.list.map((d) => d.id))

  const loading = result.key !== requestKey
  const data = result.data
  const loadError = loading ? null : result.error

  const replaceUser = (updated) => {
    setResult((prev) => ({
      ...prev,
      data: { ...prev.data, content: prev.data.content.map((u) => (u.id === updated.id ? updated : u)) },
    }))
  }

  const runAction = async (userId, action) => {
    setActionError(null)
    setPendingIds((prev) => new Set(prev).add(userId))
    try {
      replaceUser(await action())
    } catch (error) {
      setActionError(parseApiError(error).message)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleRoleChange = (target, role) => {
    if (role === target.role) return
    const confirmed = window.confirm(
      `Change ${target.name}'s role from ${ROLE_LABELS[target.role]} to ${ROLE_LABELS[role]}?`,
    )
    if (!confirmed) return
    runAction(target.id, () => updateUserRole(target.id, role))
  }

  const handleDepartmentChange = (target, departmentId) => {
    const next = departmentId || null
    if (next === (target.departmentId ?? null)) return
    runAction(target.id, () => updateUserDepartment(target.id, next))
  }

  const handleToggleStatus = (target) => {
    if (target.active) {
      const confirmed = window.confirm(`Deactivate ${target.name}? They will be signed out and unable to log in.`)
      if (!confirmed) return
    }
    runAction(target.id, () => toggleUserStatus(target.id))
  }

  const users = data?.content ?? []
  const pageInfo = data?.page

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Admin Users</h1>
          <p className="text-muted">Manage roles and account access.</p>
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

      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}
      {departments.error && (
        <div className="alert alert-error" role="alert">
          Could not load departments: {departments.error}
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
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    <Spinner size={20} label="Loading users" />
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="table-empty">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === currentUser.id
                const pending = pendingIds.has(u.id)
                return (
                  <tr key={u.id} className={u.active ? undefined : 'row-inactive'}>
                    <td>
                      {u.name}
                      {isSelf && <span className="you-tag">You</span>}
                    </td>
                    <td className="cell-muted">{u.email}</td>
                    <td>
                      <select
                        className="control control-sm"
                        value={u.role}
                        onChange={(event) => handleRoleChange(u, event.target.value)}
                        disabled={isSelf || pending}
                        aria-label={`Role for ${u.name}`}
                        title={isSelf ? 'You cannot change your own role' : undefined}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.role === 'ADMIN' ? (
                        <span className="text-muted" title="Admins don't belong to a department">
                          None
                        </span>
                      ) : (
                        <select
                          className="control control-sm"
                          value={u.departmentId ?? ''}
                          onChange={(event) => handleDepartmentChange(u, event.target.value)}
                          disabled={pending || departmentsLoading || Boolean(departments.error)}
                          aria-label={`Department for ${u.name}`}
                        >
                          <option value="">No department</option>
                          {u.departmentId && !departmentsLoading && !departmentIds.has(u.departmentId) && (
                            <option value={u.departmentId}>Unknown department</option>
                          )}
                          {departments.list.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'status-resolved' : 'status-closed'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-muted">{formatDate(u.createdAt)}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => handleToggleStatus(u)}
                        disabled={isSelf || pending}
                        title={isSelf ? 'You cannot deactivate yourself' : undefined}
                      >
                        {pending ? 'Saving…' : u.active ? 'Deactivate' : 'Activate'}
                      </button>
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
