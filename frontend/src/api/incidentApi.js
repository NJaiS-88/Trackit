import axiosInstance from './axiosInstance'

/**
 * @typedef {{content: object[], page: number, size: number, totalElements: number, totalPages: number, last: boolean}} PagedResponse
 */

export async function createIncident(data) {
  const { data: incident } = await axiosInstance.post('/api/incidents', data)
  return incident
}

/**
 * @param {{page?: number, size?: number, status?: string, priority?: string, category?: string, assignedTo?: string}} params
 * @returns {Promise<PagedResponse>}
 */
export async function getIncidents(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  const { data } = await axiosInstance.get('/api/incidents', { params: cleaned })
  return data
}

/**
 * Suggested New Incident fields from the employee's own description (AI); nothing is saved.
 * @returns {Promise<{title: string, description: string, category: string, affectedService: string | null, impact: string, urgency: string}>}
 */
export async function draftIncident(description) {
  const { data } = await axiosInstance.post('/api/incidents/draft', { description })
  return data
}

export async function getDashboardSummary() {
  const { data } = await axiosInstance.get('/api/incidents/dashboard/summary')
  return data
}

export async function getIncidentById(id) {
  const { data } = await axiosInstance.get(`/api/incidents/${encodeURIComponent(id)}`)
  return data
}

export async function updateIncident(id, data) {
  const { data: incident } = await axiosInstance.put(`/api/incidents/${encodeURIComponent(id)}`, data)
  return incident
}

export async function changeStatus(id, data) {
  const { data: incident } = await axiosInstance.patch(`/api/incidents/${encodeURIComponent(id)}/status`, data)
  return incident
}

export async function deleteIncident(id) {
  await axiosInstance.delete(`/api/incidents/${encodeURIComponent(id)}`)
}
