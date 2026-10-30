import axiosInstance from './axiosInstance'

/**
 * @typedef {{id: string, name: string, email: string, role: 'EMPLOYEE' | 'ENGINEER' | 'ADMIN', departmentId: string | null, active: boolean, createdAt: string}} User
 * @typedef {{content: User[], page: {size: number, number: number, totalElements: number, totalPages: number}}} UserPage
 */

/** @returns {Promise<UserPage>} */
export async function getUsers({ page = 0, size = 20, sort = 'createdAt,desc' } = {}) {
  const { data } = await axiosInstance.get('/api/admin/users', { params: { page, size, sort } })
  return data
}

/** @returns {Promise<User>} */
export async function updateUserRole(id, role) {
  const { data } = await axiosInstance.patch(`/api/admin/users/${encodeURIComponent(id)}/role`, { role })
  return data
}

/** Pass null to remove the user from their department. @returns {Promise<User>} */
export async function updateUserDepartment(id, departmentId) {
  const { data } = await axiosInstance.patch(`/api/admin/users/${encodeURIComponent(id)}/department`, {
    departmentId,
  })
  return data
}

/** Flips the user's active flag. @returns {Promise<User>} */
export async function toggleUserStatus(id) {
  const { data } = await axiosInstance.patch(`/api/admin/users/${encodeURIComponent(id)}/status`)
  return data
}
