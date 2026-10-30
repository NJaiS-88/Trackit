import axiosInstance from './axiosInstance'

/**
 * @typedef {'ACTIVE' | 'ON_HOLD' | 'COMPLETED'} ProjectStatus
 * @typedef {{id: string, name: string, status: ProjectStatus, createdAt: string}} Project
 * @typedef {{id: string, name: string, email: string, projectId: string | null}} TeamMember
 * @typedef {{departmentId: string | null, departmentName: string | null, members: TeamMember[], projects: Project[]}} Team
 */

/** The signed-in Lead's department, its employees and its projects. @returns {Promise<Team>} */
export async function getTeam() {
  const { data } = await axiosInstance.get('/api/team')
  return data
}

/** @returns {Promise<Project>} */
export async function createProject(name) {
  const { data } = await axiosInstance.post('/api/team/projects', { name })
  return data
}

/** @returns {Promise<Project>} */
export async function updateProjectStatus(projectId, status) {
  const { data } = await axiosInstance.patch(`/api/team/projects/${encodeURIComponent(projectId)}/status`, {
    status,
  })
  return data
}

/** Pass null to remove the employee from their project. @returns {Promise<TeamMember>} */
export async function assignProject(memberId, projectId) {
  const { data } = await axiosInstance.patch(`/api/team/members/${encodeURIComponent(memberId)}/project`, {
    projectId,
  })
  return data
}
