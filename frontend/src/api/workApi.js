import axiosInstance from './axiosInstance'

/**
 * @typedef {'PROJECT_TASK' | 'TICKET'} WorkItemType
 * @typedef {'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED'} WorkItemStatus
 * @typedef {{
 *   id: string, type: WorkItemType, title: string, description: string | null, status: WorkItemStatus,
 *   departmentId: string, departmentName: string | null, projectId: string | null, projectName: string | null,
 *   incidentId: string | null, incidentNumber: string | null, priority: string | null,
 *   assigneeId: string, assigneeName: string | null, assignedByName: string | null,
 *   dueDate: string | null, declineReason: string | null,
 *   createdAt: string, updatedAt: string, completedAt: string | null
 * }} WorkItem
 * @typedef {{
 *   id: string, incidentNumber: string, title: string, description: string, category: string,
 *   priority: string, priorityLabel: string, status: string, reporterName: string | null, createdAt: string,
 *   workItemId: string | null, workAssigneeName: string | null, workStatus: WorkItemStatus | null
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

/** @returns {Promise<WorkItem>} */
export async function createTask(task) {
  const { data } = await axiosInstance.post('/api/team/work/tasks', task)
  return data
}

/** @returns {Promise<WorkItem>} */
export async function assignTicket(incidentId, assigneeId, dueDate = null) {
  const { data } = await axiosInstance.post(`/api/team/tickets/${id(incidentId)}/assign`, { assigneeId, dueDate })
  return data
}

/** @returns {Promise<WorkItem>} */
export async function reassignWork(workItemId, assigneeId) {
  const { data } = await axiosInstance.patch(`/api/team/work/${id(workItemId)}/assignee`, { assigneeId })
  return data
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
