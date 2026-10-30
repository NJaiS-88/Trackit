import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getTeam } from '../api/teamApi'
import { assignTicket, createTask, getTeamTickets, getTeamWork, reassignWork } from '../api/workApi'
import DueDate from '../components/DueDate'
import FormField from '../components/FormField'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
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
import { formatDate, todayIso } from '../utils/format'

const EMPTY_TASK = { projectId: '', assigneeId: '', title: '', description: '', dueDate: '' }
const REASSIGNABLE = new Set(['ASSIGNED', 'DECLINED'])

function validateTask(task) {
  const errors = {}
  if (!task.projectId) errors.projectId = 'Choose a project'
  if (!task.assigneeId) errors.assigneeId = 'Choose an employee'
  const title = task.title.trim()
  if (!title) errors.title = 'Title is required'
  else if (title.length < 3 || title.length > 120) errors.title = 'Title must be between 3 and 120 characters'
  if (task.description.trim().length > 2000) errors.description = 'Description must be at most 2000 characters'
  if (task.dueDate && task.dueDate < todayIso()) errors.dueDate = 'Due date cannot be in the past'
  return errors
}

export default function TeamWork() {
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [message, setMessage] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [ticketChoice, setTicketChoice] = useState({})
  const [reassignChoice, setReassignChoice] = useState({})

  const [task, setTask] = useState(EMPTY_TASK)
  const [taskErrors, setTaskErrors] = useState({})
  const [taskError, setTaskError] = useState(null)
  const [creating, setCreating] = useState(false)

  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([getTeam(), getTeamTickets(), getTeamWork()])
      .then(([team, tickets, work]) => {
        if (!ignore) setResult({ key: reloadCount, data: { team, tickets, work }, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult((prev) => ({ key: reloadCount, data: prev.data, error: parseApiError(err).message }))
      })
    return () => {
      ignore = true
    }
  }, [reloadCount])

  const loading = result.key !== reloadCount
  const team = result.data?.team
  const tickets = useMemo(() => result.data?.tickets ?? [], [result.data])
  const work = useMemo(() => result.data?.work ?? [], [result.data])
  const members = team?.members ?? []
  const activeProjects = (team?.projects ?? []).filter((p) => p.status !== 'COMPLETED')
  const counts = countByStatus(work)
  const reload = () => setReloadCount((count) => count + 1)

  const projectMembers = members.filter((m) => task.projectId && m.projectId === task.projectId)

  const visibleWork = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return work.filter(
      (w) =>
        (!statusFilter || w.status === statusFilter) &&
        (!typeFilter || w.type === typeFilter) &&
        (!keyword ||
          w.title.toLowerCase().includes(keyword) ||
          (w.assigneeName ?? '').toLowerCase().includes(keyword) ||
          workSource(w).toLowerCase().includes(keyword)),
    )
  }, [work, statusFilter, typeFilter, search])

  const runAction = async (id, action, successMessage) => {
    setActionError(null)
    setMessage(null)
    setPendingIds((prev) => new Set(prev).add(id))
    try {
      await action()
      setMessage(successMessage)
      reload()
    } catch (error) {
      setActionError(parseApiError(error).message)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleAssignTicket = (ticket) => {
    const assigneeId = ticketChoice[ticket.id]
    if (!assigneeId) {
      setActionError(`Choose an employee for ${ticket.incidentNumber} first.`)
      return
    }
    const name = members.find((m) => m.id === assigneeId)?.name ?? 'the employee'
    runAction(ticket.id, () => assignTicket(ticket.id, assigneeId), `${ticket.incidentNumber} assigned to ${name}.`)
  }

  const handleReassign = (item) => {
    const assigneeId = reassignChoice[item.id]
    if (!assigneeId) {
      setActionError(`Choose an employee to reassign "${item.title}" to.`)
      return
    }
    const name = members.find((m) => m.id === assigneeId)?.name ?? 'the employee'
    runAction(item.id, () => reassignWork(item.id, assigneeId), `"${item.title}" reassigned to ${name}.`)
  }

  const handleTaskChange = (event) => {
    const { name, value } = event.target
    setTask((prev) => ({ ...prev, [name]: value, ...(name === 'projectId' ? { assigneeId: '' } : {}) }))
    setTaskErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleCreateTask = async (event) => {
    event.preventDefault()
    setTaskError(null)
    setMessage(null)
    const errors = validateTask(task)
    setTaskErrors(errors)
    if (Object.keys(errors).length > 0) return

    setCreating(true)
    try {
      const created = await createTask({
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        title: task.title.trim(),
        description: task.description.trim() || null,
        dueDate: task.dueDate || null,
      })
      setTask(EMPTY_TASK)
      setMessage(`"${created.title}" assigned to ${created.assigneeName ?? 'the employee'}.`)
      reload()
    } catch (error) {
      const { message: errorMessage, fieldErrors } = parseApiError(error)
      setTaskErrors(fieldErrors)
      setTaskError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const reassignOptions = (item) =>
    members.filter((m) => (item.type === 'PROJECT_TASK' ? m.projectId === item.projectId : true))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Work Assignments</h1>
          <p className="text-muted">
            Assign department tickets and project tasks to your employees, and follow their progress.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={reload} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {result.error && !loading && (
        <div className="alert alert-error" role="alert">
          {result.error}
        </div>
      )}

      {!result.data && loading && (
        <div className="page-center">
          <Spinner size={28} label="Loading work assignments" />
        </div>
      )}

      {team && !team.departmentId && (
        <div className="card glass">
          <p className="text-muted">
            You haven&apos;t been assigned to a department yet. An admin needs to add you to one before you can
            assign work.
          </p>
        </div>
      )}

      {team?.departmentId && (
        <>
          <section className="stat-grid" aria-label="Work statistics">
            {WORK_STATS.map((stat) => (
              <div key={stat.key} className={`stat-card glass tone-${stat.tone}`}>
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{counts[stat.key]}</span>
              </div>
            ))}
          </section>

          {message && (
            <div className="alert alert-success section-alert" role="status">
              {message}
            </div>
          )}
          {actionError && (
            <div className="alert alert-error section-alert" role="alert">
              {actionError}
            </div>
          )}

          <section className="section">
            <div className="section-header">
              <h2>Department tickets</h2>
              <span className="text-muted section-meta">
                Unresolved tickets raised in {team.departmentName ?? 'your department'}
              </span>
            </div>
            <div className="table-card glass">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Priority</th>
                    <th>Reported by</th>
                    <th>Ticket status</th>
                    <th>Handled by</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="table-empty">
                        No open tickets in your department.
                      </td>
                    </tr>
                  )}
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="cell-title">{t.title}</div>
                        <div className="cell-sub">
                          {t.incidentNumber} · {formatDate(t.createdAt)}
                        </div>
                      </td>
                      <td>
                        <PriorityBadge priority={t.priority} label={t.priorityLabel} />
                      </td>
                      <td className="cell-muted">{t.reporterName ?? '—'}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        {t.workItemId ? (
                          <div className="assignee-cell">
                            <span>{t.workAssigneeName ?? 'Unknown employee'}</span>
                            <WorkStatusBadge status={t.workStatus} />
                          </div>
                        ) : (
                          <div className="action-group">
                            <select
                              className="control control-sm"
                              value={ticketChoice[t.id] ?? ''}
                              onChange={(event) =>
                                setTicketChoice((prev) => ({ ...prev, [t.id]: event.target.value }))
                              }
                              disabled={pendingIds.has(t.id) || members.length === 0}
                              aria-label={`Employee for ${t.incidentNumber}`}
                            >
                              <option value="">{members.length === 0 ? 'No employees' : 'Choose employee'}</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAssignTicket(t)}
                              disabled={pendingIds.has(t.id) || !ticketChoice[t.id]}
                            >
                              {pendingIds.has(t.id) ? 'Assigning…' : 'Assign'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2>Assign project work</h2>
            </div>
            <form className="card glass form-grid" onSubmit={handleCreateTask} noValidate>
              {taskError && (
                <div className="alert alert-error span-2" role="alert">
                  {taskError}
                </div>
              )}
              {activeProjects.length === 0 ? (
                <p className="text-muted span-2">
                  Your department has no active projects. Create one on <Link to="/team">My Team</Link> first.
                </p>
              ) : (
                <>
                  <FormField
                    id="projectId"
                    label="Project"
                    as="select"
                    value={task.projectId}
                    onChange={handleTaskChange}
                    error={taskErrors.projectId}
                  >
                    <option value="">Select a project</option>
                    {activeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </FormField>

                  <FormField
                    id="assigneeId"
                    label="Employee"
                    as="select"
                    value={task.assigneeId}
                    onChange={handleTaskChange}
                    error={taskErrors.assigneeId}
                    disabled={!task.projectId}
                    hint={
                      task.projectId && projectMembers.length === 0
                        ? 'Nobody is on this project yet. Assign employees to it on My Team.'
                        : undefined
                    }
                  >
                    <option value="">{task.projectId ? 'Select an employee' : 'Choose a project first'}</option>
                    {projectMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </FormField>

                  <div className="span-2">
                    <FormField
                      id="title"
                      label="Title"
                      placeholder="e.g. Build the login screen"
                      maxLength={120}
                      value={task.title}
                      onChange={handleTaskChange}
                      error={taskErrors.title}
                    />
                  </div>

                  <div className="span-2">
                    <FormField
                      id="description"
                      label="Description (optional)"
                      as="textarea"
                      rows={3}
                      maxLength={2000}
                      placeholder="What needs to be done, and what done looks like"
                      value={task.description}
                      onChange={handleTaskChange}
                      error={taskErrors.description}
                    />
                  </div>

                  <FormField
                    id="dueDate"
                    label="Due date (optional)"
                    type="date"
                    min={todayIso()}
                    value={task.dueDate}
                    onChange={handleTaskChange}
                    error={taskErrors.dueDate}
                  />

                  <div className="form-actions span-2">
                    <button type="submit" className="btn btn-primary" disabled={creating}>
                      {creating && <Spinner />}
                      {creating ? 'Assigning…' : 'Assign Task'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </section>

          <section className="section">
            <div className="section-header">
              <h2>All assigned work</h2>
            </div>

            <div className="filter-bar glass">
              <input
                className="control filter-search"
                type="search"
                placeholder="Search by title, employee, project or ticket"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search work"
              />
              <select
                className="control"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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
                onChange={(event) => setTypeFilter(event.target.value)}
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-card glass">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work</th>
                    <th>Assigned to</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleWork.length === 0 && (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        {work.length === 0 ? 'No work assigned yet.' : 'No work matches these filters.'}
                      </td>
                    </tr>
                  )}
                  {visibleWork.map((w) => {
                    const open = w.status !== 'COMPLETED'
                    const options = reassignOptions(w)
                    return (
                      <tr key={w.id}>
                        <td>
                          <div className="cell-title">{w.title}</div>
                          <div className="cell-sub">
                            {WORK_TYPE_LABELS[w.type]} · {workSource(w)}
                          </div>
                        </td>
                        <td>{w.assigneeName ?? '—'}</td>
                        <td>
                          <WorkStatusBadge status={w.status} />
                          {w.status === 'DECLINED' && w.declineReason && (
                            <div className="decline-reason">“{w.declineReason}”</div>
                          )}
                        </td>
                        <td className="cell-muted">
                          <DueDate value={w.dueDate} open={open} />
                        </td>
                        <td className="cell-muted">{formatDate(w.updatedAt)}</td>
                        <td className="cell-actions">
                          {REASSIGNABLE.has(w.status) && (
                            <div className="action-group">
                              <select
                                className="control control-sm"
                                value={reassignChoice[w.id] ?? ''}
                                onChange={(event) =>
                                  setReassignChoice((prev) => ({ ...prev, [w.id]: event.target.value }))
                                }
                                disabled={pendingIds.has(w.id) || options.length === 0}
                                aria-label={`Reassign ${w.title}`}
                              >
                                <option value="">Reassign to…</option>
                                {options.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleReassign(w)}
                                disabled={pendingIds.has(w.id) || !reassignChoice[w.id]}
                              >
                                {pendingIds.has(w.id) ? 'Saving…' : 'Reassign'}
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
          </section>
        </>
      )}
    </div>
  )
}
