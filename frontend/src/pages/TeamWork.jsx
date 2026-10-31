import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getTeam } from '../api/teamApi'
import {
  assignTicket,
  createTask,
  getTeamTickets,
  getTeamWork,
  reassignWork,
  uploadAttachments,
} from '../api/workApi'
import AttachmentList from '../components/AttachmentList'
import AttachmentPicker from '../components/AttachmentPicker'
import DueDate from '../components/DueDate'
import SlaBadge from '../components/SlaBadge'
import { useNow } from '../hooks/useNow'
import FormField from '../components/FormField'
import MultiSelect from '../components/MultiSelect'
import PriorityBadge from '../components/PriorityBadge'
import RoutingSuggestion from '../components/RoutingSuggestion'
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
import Timestamp from '../components/Timestamp'
import { isPastDeadline, todayIso } from '../utils/format'

const EMPTY_TASK = { projectId: '', assigneeIds: [], title: '', description: '', dueDate: '', dueTime: '' }
const REASSIGNABLE = new Set(['ASSIGNED', 'DECLINED'])
const OPEN_WORK = new Set(['ASSIGNED', 'IN_PROGRESS', 'DECLINED'])

function namesOf(ids, members) {
  const names = ids.map((id) => members.find((m) => m.id === id)?.name ?? 'an employee')
  return names.length <= 2 ? names.join(' and ') : `${names.length} employees`
}

function validateTask(task) {
  const errors = {}
  if (!task.projectId) errors.projectId = 'Choose a project'
  if (task.assigneeIds.length === 0) errors.assigneeIds = 'Choose at least one employee'
  const title = task.title.trim()
  if (!title) errors.title = 'Title is required'
  else if (title.length < 3 || title.length > 120) errors.title = 'Title must be between 3 and 120 characters'
  const description = task.description.trim()
  if (!description) errors.description = 'Description is required'
  else if (description.length > 2000) errors.description = 'Description must be at most 2000 characters'
  if (!task.dueDate) errors.dueDate = 'Due date is required'
  if (!task.dueTime) errors.dueTime = 'Due time is required'
  if (task.dueDate && task.dueDate < todayIso()) errors.dueDate = 'Due date cannot be in the past'
  else if (task.dueDate && task.dueTime && isPastDeadline(task.dueDate, task.dueTime)) {
    errors.dueTime = 'This time has already passed'
  }
  return errors
}

export default function TeamWork() {
  const now = useNow()
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
  const [taskFiles, setTaskFiles] = useState([])
  const [uploading, setUploading] = useState(false)

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

  const handleAssignTicket = async (ticket) => {
    const assigneeIds = ticketChoice[ticket.id] ?? []
    if (assigneeIds.length === 0) {
      setActionError(`Choose at least one employee for ${ticket.incidentNumber} first.`)
      return
    }
    await runAction(
      ticket.id,
      () => assignTicket(ticket.id, assigneeIds),
      `${ticket.incidentNumber} assigned to ${namesOf(assigneeIds, members)}.`,
    )
    setTicketChoice((prev) => ({ ...prev, [ticket.id]: [] }))
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
    setTask((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'projectId' ? { assigneeIds: [] } : {}),
    }))
    setTaskErrors((prev) => ({ ...prev, [name]: undefined, ...(name === 'dueDate' ? { dueTime: undefined } : {}) }))
  }

  const handleTaskAssignees = (assigneeIds) => {
    setTask((prev) => ({ ...prev, assigneeIds }))
    setTaskErrors((prev) => ({ ...prev, assigneeIds: undefined }))
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
      let attachmentIds = []
      if (taskFiles.length > 0) {
        setUploading(true)
        attachmentIds = (await uploadAttachments(taskFiles)).map((a) => a.id)
        setUploading(false)
      }
      const created = await createTask({
        projectId: task.projectId,
        assigneeIds: task.assigneeIds,
        title: task.title.trim(),
        description: task.description.trim(),
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        attachmentIds,
      })
      setTask(EMPTY_TASK)
      setTaskFiles([])
      setMessage(`"${task.title.trim()}" assigned to ${namesOf(created.map((w) => w.assigneeId), members)}.`)
      reload()
    } catch (error) {
      const { message: errorMessage, fieldErrors } = parseApiError(error)
      setTaskErrors(fieldErrors)
      setTaskError(errorMessage)
    } finally {
      setUploading(false)
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
            <div className="table-card table-fit tickets-table glass">
              <table className="data-table">
                <colgroup>
                  <col className="col-ticket" />
                  <col className="col-priority" />
                  <col className="col-reporter" />
                  <col className="col-raised" />
                  <col className="col-status" />
                  <col className="col-sla" />
                  <col className="col-handled" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Priority</th>
                    <th>Reported by</th>
                    <th>Raised</th>
                    <th>Ticket status</th>
                    <th>SLA deadline</th>
                    <th>Handled by</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        No open tickets in your department.
                      </td>
                    </tr>
                  )}
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="cell-title">{t.title}</div>
                        <div className="cell-sub">{t.incidentNumber}</div>
                        <RoutingSuggestion recommendation={t.routingRecommendation} />
                      </td>
                      <td>
                        <PriorityBadge priority={t.priority} label={t.priorityLabel} />
                      </td>
                      <td className="cell-muted">{t.reporterName ?? '—'}</td>
                      <td className="cell-muted">
                        <Timestamp value={t.createdAt} />
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="cell-muted">
                        <SlaBadge dueAt={t.dueAt} slaStatus={t.slaStatus} status={t.status} now={now} />
                      </td>
                      <td>
                        {(() => {
                          const onTicket = new Set(
                            t.assignees.filter((a) => OPEN_WORK.has(a.status)).map((a) => a.assigneeId),
                          )
                          const available = members.filter((m) => !onTicket.has(m.id))
                          const chosen = ticketChoice[t.id] ?? []
                          return (
                            <div className="ticket-assign">
                              {t.assignees.length > 0 && (
                                <ul className="assignee-list">
                                  {t.assignees.map((a) => (
                                    <li key={a.workItemId}>
                                      <span>{a.name ?? 'Unknown employee'}</span>
                                      <WorkStatusBadge status={a.status} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="action-group">
                                <MultiSelect
                                  size="sm"
                                  options={available.map((m) => ({ value: m.id, label: m.name }))}
                                  selected={chosen}
                                  onChange={(ids) => setTicketChoice((prev) => ({ ...prev, [t.id]: ids }))}
                                  placeholder={t.assignees.length > 0 ? 'Add employees' : 'Choose employees'}
                                  emptyText="Everyone in your department is already on this ticket"
                                  disabled={pendingIds.has(t.id) || members.length === 0}
                                  ariaLabel={`Employees for ${t.incidentNumber}`}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleAssignTicket(t)}
                                  disabled={pendingIds.has(t.id) || chosen.length === 0}
                                >
                                  {pendingIds.has(t.id) ? 'Assigning…' : 'Assign'}
                                </button>
                              </div>
                            </div>
                          )
                        })()}
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

                  <div className="form-field">
                    <span className="form-label">Employees</span>
                    <MultiSelect
                      options={projectMembers.map((m) => ({ value: m.id, label: m.name }))}
                      selected={task.assigneeIds}
                      onChange={handleTaskAssignees}
                      placeholder={task.projectId ? 'Select employees' : 'Choose a project first'}
                      emptyText="Nobody is on this project yet"
                      disabled={!task.projectId}
                      invalid={Boolean(taskErrors.assigneeIds)}
                      ariaLabel="Employees"
                    />
                    {taskErrors.assigneeIds ? (
                      <p className="field-error">{taskErrors.assigneeIds}</p>
                    ) : (
                      <p className="field-hint">
                        {task.projectId && projectMembers.length === 0
                          ? 'Assign employees to this project on My Team first.'
                          : 'Each selected employee gets their own copy of the task.'}
                      </p>
                    )}
                  </div>

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
                      label="Description"
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
                    label="Due date"
                    type="date"
                    min={todayIso()}
                    value={task.dueDate}
                    onChange={handleTaskChange}
                    error={taskErrors.dueDate}
                  />

                  <FormField
                    id="dueTime"
                    label="Due time"
                    type="time"
                    value={task.dueTime}
                    onChange={handleTaskChange}
                    error={taskErrors.dueTime}
                  />

                  <div className="form-field span-2">
                    <span className="form-label">Attachments (optional)</span>
                    <p className="field-hint attachment-picker-help">
                      Specs, designs or reference material for this work. Every assigned employee can download them.
                    </p>
                    <AttachmentPicker files={taskFiles} onChange={setTaskFiles} disabled={creating} />
                  </div>

                  <div className="form-actions span-2">
                    <button type="submit" className="btn btn-primary" disabled={creating}>
                      {creating && <Spinner />}
                      {uploading ? 'Uploading files…' : creating ? 'Assigning…' : 'Assign Task'}
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
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleWork.length === 0 && (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        {work.length === 0 ? 'No work assigned yet.' : 'No work matches these filters.'}
                      </td>
                    </tr>
                  )}
                  {visibleWork.map((w) => {
                    const options = reassignOptions(w)
                    return (
                      <tr key={w.id}>
                        <td>
                          <div className="cell-title">{w.title}</div>
                          <div className="cell-sub">
                            {WORK_TYPE_LABELS[w.type]} · {workSource(w)}
                          </div>
                          <AttachmentList attachments={w.attachments} />
                        </td>
                        <td>{w.assigneeName ?? '—'}</td>
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
                          {w.type === 'TICKET' ? (
                            <SlaBadge dueAt={w.slaDueAt} slaStatus={w.slaStatus} now={now} />
                          ) : (
                            <DueDate item={w} now={now} />
                          )}
                        </td>
                        <td className="cell-muted">
                          <Timestamp value={w.updatedAt} />
                        </td>
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
