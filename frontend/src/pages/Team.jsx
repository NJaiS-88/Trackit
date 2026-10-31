import { useEffect, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { assignProject, createProject, getTeam, updateProjectStatus } from '../api/teamApi'
import Spinner from '../components/Spinner'
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from '../constants/roles'
import Timestamp from '../components/Timestamp'

const COLUMN_COUNT = 4
const PROJECT_COLUMN_COUNT = 4

export default function Team() {
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [actionError, setActionError] = useState(null)
  const [pendingIds, setPendingIds] = useState(() => new Set())

  const [projectName, setProjectName] = useState('')
  const [projectError, setProjectError] = useState(null)
  const [projectMessage, setProjectMessage] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let ignore = false
    getTeam()
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
  const team = result.data
  const loadError = loading ? null : result.error
  const members = team?.members ?? []
  const projects = team?.projects ?? []
  const hasDepartment = Boolean(team?.departmentId)

  const replaceMember = (updated) => {
    setResult((prev) => ({
      ...prev,
      data: { ...prev.data, members: prev.data.members.map((m) => (m.id === updated.id ? updated : m)) },
    }))
  }

  const handleProjectChange = async (member, projectId) => {
    const next = projectId || null
    if (next === (member.projectId ?? null)) return
    setActionError(null)
    setPendingIds((prev) => new Set(prev).add(member.id))
    try {
      replaceMember(await assignProject(member.id, next))
    } catch (error) {
      setActionError(parseApiError(error).message)
    } finally {
      setPendingIds((prev) => {
        const nextIds = new Set(prev)
        nextIds.delete(member.id)
        return nextIds
      })
    }
  }

  const memberCounts = members.reduce((counts, m) => {
    if (m.projectId) counts[m.projectId] = (counts[m.projectId] ?? 0) + 1
    return counts
  }, {})

  const handleStatusChange = async (project, status) => {
    if (status === project.status) return
    setProjectError(null)
    setProjectMessage(null)
    setPendingIds((prev) => new Set(prev).add(project.id))
    try {
      const updated = await updateProjectStatus(project.id, status)
      setResult((prev) => ({
        ...prev,
        data: { ...prev.data, projects: prev.data.projects.map((p) => (p.id === updated.id ? updated : p)) },
      }))
    } catch (error) {
      setProjectError(parseApiError(error).message)
    } finally {
      setPendingIds((prev) => {
        const nextIds = new Set(prev)
        nextIds.delete(project.id)
        return nextIds
      })
    }
  }

  const handleCreateProject = async (event) => {
    event.preventDefault()
    setProjectError(null)
    setProjectMessage(null)
    const name = projectName.trim()
    if (name.length < 2 || name.length > 80) {
      setProjectError('Project name must be between 2 and 80 characters')
      return
    }

    setCreating(true)
    try {
      const created = await createProject(name)
      setProjectName('')
      setProjectMessage(`Created the ${created.name} project.`)
      setResult((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          projects: [...prev.data.projects, created].sort((a, b) => a.name.localeCompare(b.name)),
        },
      }))
    } catch (error) {
      setProjectError(parseApiError(error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Team</h1>
          <p className="text-muted">
            {hasDepartment
              ? `Employees in the ${team.departmentName ?? 'your'} department. Assign each of them to a project.`
              : 'Employees in your department.'}
          </p>
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

      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      )}

      {loading && !team && (
        <div className="page-center">
          <Spinner size={28} label="Loading your team" />
        </div>
      )}

      {team && !hasDepartment && (
        <div className="card glass">
          <p className="text-muted">
            You haven&apos;t been assigned to a department yet. An admin needs to add you to one before you can
            manage a team.
          </p>
        </div>
      )}

      {team && hasDepartment && (
        <>
          <form className="card glass team-project-form" onSubmit={handleCreateProject} noValidate>
            <h2>New project</h2>
            {projectError && (
              <div className="alert alert-error" role="alert">
                {projectError}
              </div>
            )}
            {projectMessage && (
              <div className="alert alert-success" role="status">
                {projectMessage}
              </div>
            )}
            <div className="inline-form">
              <input
                className="control"
                name="projectName"
                placeholder="New project name"
                maxLength={80}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                aria-label="New project name"
              />
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating && <Spinner />}
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>

          <section className="section">
            <div className="section-header">
              <h2>Projects</h2>
            </div>
            <div className="table-card glass">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Employees</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={PROJECT_COLUMN_COUNT} className="table-empty">
                        No projects yet. Create one above to start assigning employees.
                      </td>
                    </tr>
                  )}
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <select
                          className="control control-sm"
                          value={p.status}
                          onChange={(event) => handleStatusChange(p, event.target.value)}
                          disabled={pendingIds.has(p.id)}
                          aria-label={`Status of ${p.name}`}
                        >
                          {PROJECT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {PROJECT_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-muted">{memberCounts[p.id] ?? 0}</td>
                      <td className="cell-muted">
                        <Timestamp value={p.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}

          <section className="section">
            <div className="section-header">
              <h2>Employees</h2>
            </div>
            <div className="table-card glass">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Project</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className="table-empty">
                        No employees in your department yet.
                      </td>
                    </tr>
                  )}
                  {members.map((m) => {
                    const pending = pendingIds.has(m.id)
                    return (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td className="cell-muted">{m.email}</td>
                        <td className="cell-muted">{team.departmentName ?? '—'}</td>
                        <td>
                          <select
                            className="control control-sm"
                            value={m.projectId ?? ''}
                            onChange={(event) => handleProjectChange(m, event.target.value)}
                            disabled={pending}
                            aria-label={`Project for ${m.name}`}
                          >
                            <option value="">No project</option>
                            {m.projectId && !projects.some((p) => p.id === m.projectId) && (
                              <option value={m.projectId}>Unknown project</option>
                            )}
                            {projects
                              .filter((p) => p.status !== 'COMPLETED' || p.id === m.projectId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.status !== 'ACTIVE' ? ` (${PROJECT_STATUS_LABELS[p.status]})` : ''}
                                </option>
                              ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
