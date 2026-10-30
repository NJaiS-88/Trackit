import axiosInstance from './axiosInstance'

/**
 * @typedef {import('./teamApi').ProjectStatus} ProjectStatus
 * @typedef {{id: string, name: string, status: ProjectStatus, departmentId: string, departmentName: string | null, leads: string[], employees: string[], createdAt: string}} AdminProject
 */

/** Every project across all departments, sorted by department then name. @returns {Promise<AdminProject[]>} */
export async function getAllProjects() {
  const { data } = await axiosInstance.get('/api/admin/projects')
  return data
}
