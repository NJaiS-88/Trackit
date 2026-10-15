import { useCallback, useEffect, useState } from 'react'
import { parseApiError } from '../../api/client'
import { getUsers, toggleUserStatus, updateUserRole } from '../../api/users'
import { useAuth } from '../../auth/useAuth'
import Pagination from '../../components/Pagination'
import { ROLE_LABELS, ROLES } from '../../constants/roles'

const PAGE_SIZE = 20

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export default function UsersPage() {
  const { user: currentUser } = useAuth()

  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [pendingIds, setPendingIds] = useState(() => new Set())

  const loadPage = useCallback(async (pageToLoad) => {
    setLoading(true)
    setLoadError(null)
    try {
      setData(await getUsers({ page: pageToLoad, size: PAGE_SIZE }))
    } catch (error) {
      setLoadError(parseApiError(error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPage(page)
  }, [page, loadPage])

  const replaceUser = (updated) => {
    setData((prev) => ({
      ...prev,
      content: prev.content.map((u) => (u.id === updated.id ? updated : u)),
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
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="muted">Manage roles and account access.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => loadPage(page)} disabled={loading}>
          Refresh
        </button>
      </div>

      {actionError && (
        <div className="alert" role="alert">
          {actionError}
        </div>
      )}

      {loadError ? (
        <div className="alert" role="alert">
          {loadError}
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Expertise</th>
                <th>Status</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-empty">
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-empty">
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
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="role-select"
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
                      {u.expertise.length > 0 ? (
                        <div className="chips">
                          {u.expertise.map((item) => (
                            <span key={item} className="chip">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${u.active ? 'status-active' : 'status-inactive'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.createdAt ? dateFormatter.format(new Date(u.createdAt)) : '—'}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className={u.active ? 'btn-danger' : 'btn-secondary'}
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
    </main>
  )
}
