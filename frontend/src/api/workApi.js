import axiosInstance from './axiosInstance'

/**
 * @typedef {{id: string, name: string, path: string, size: number, contentType: string}} Attachment
 * @typedef {'PROJECT_TASK' | 'TICKET'} WorkItemType
 * @typedef {'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED'} WorkItemStatus
 * @typedef {{
 *   id: string, type: WorkItemType, title: string, description: string | null, status: WorkItemStatus,
 *   departmentId: string, departmentName: string | null, projectId: string | null, projectName: string | null,
 *   incidentId: string | null, incidentNumber: string | null, priority: string | null,
 *   assigneeId: string, assigneeName: string | null, assignedByName: string | null,
 *   dueDate: string | null, dueTime: string | null, declineReason: string | null,
 *   createdAt: string, updatedAt: string, completedAt: string | null
 * }} WorkItem
 * @typedef {{workItemId: string, assigneeId: string, name: string | null, status: WorkItemStatus}} TicketAssignee
 * @typedef {{
 *   id: string, incidentNumber: string, title: string, description: string, category: string,
 *   priority: string, priorityLabel: string, status: string, reporterName: string | null, createdAt: string,
 *   assignees: TicketAssignee[]
 * }} TeamTicket
 */

const id = (value) => encodeURIComponent(value)

// ---------- Lead ----------

/** @returns {Promise<WorkItem[]>} */
export async function getTeamWork() {
  const { data } = await axiosInstance.get('/api/team/work')
  return data
}

/** @returns {Promise<TeamTicket[]>} */
export async function getTeamTickets() {
  const { data } = await axiosInstance.get('/api/team/tickets')
  return data
}

/** Creates one work item per employee in `task.assigneeIds`. @returns {Promise<WorkItem[]>} */
export async function createTask(task) {
  const { data } = await axiosInstance.post('/api/team/work/tasks', task)
  return data
}

/** Assigns a ticket to every employee in `assigneeIds`. @returns {Promise<WorkItem[]>} */
export async function assignTicket(incidentId, assigneeIds, dueDate = null) {
  const { data } = await axiosInstance.post(`/api/team/tickets/${id(incidentId)}/assign`, { assigneeIds, dueDate })
  return data
}

/** @returns {Promise<WorkItem>} */
export async function reassignWork(workItemId, assigneeId) {
  const { data } = await axiosInstance.patch(`/api/team/work/${id(workItemId)}/assignee`, { assigneeId })
  return data
}

/**
 * Uploads reference files for project work. Files picked from a folder keep their folder path
 * (`webkitRelativePath`). @returns {Promise<Attachment[]>}
 */
export async function uploadAttachments(files) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file, file.name))
  form.append('paths', JSON.stringify(files.map((file) => file.webkitRelativePath || file.name)))
  // Overrides the instance's JSON default so axios sends the FormData as-is and the browser adds the boundary
  const { data } = await axiosInstance.post('/api/team/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Downloads through the API client (so the auth cookies go along) and saves the file under its name.
 * @param {Attachment} attachment
 */
export async function downloadAttachment(attachment) {
  const { data } = await axiosInstance.get(`/api/attachments/${id(attachment.id)}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- Employee ----------

/** @returns {Promise<WorkItem[]>} */
export async function getMyWork() {
  const { data } = await axiosInstance.get('/api/my-work')
  return data
}

/** @returns {Promise<WorkItem>} */
export async function startWork(workItemId) {
  const { data } = await axiosInstance.post(`/api/my-work/${id(workItemId)}/start`)
  return data
}

/** @returns {Promise<WorkItem>} */
export async function completeWork(workItemId) {
  const { data } = await axiosInstance.post(`/api/my-work/${id(workItemId)}/complete`)
  return data
}

/** @returns {Promise<WorkItem>} */
export async function declineWork(workItemId, reason) {
  const { data } = await axiosInstance.post(`/api/my-work/${id(workItemId)}/decline`, { reason })
  return data
}

// ---------- Admin ----------

/** @returns {Promise<WorkItem[]>} */
export async function getAllWork() {
  const { data } = await axiosInstance.get('/api/admin/work')
  return data
}
