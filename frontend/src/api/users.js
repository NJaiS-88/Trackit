import apiClient from './client'

/**
 * @typedef {'EMPLOYEE' | 'ENGINEER' | 'ADMIN'} Role
 * @typedef {{id: string, name: string, email: string, role: Role, expertise: string[], active: boolean, createdAt: string}} User
 * @typedef {{content: User[], page: {size: number, number: number, totalElements: number, totalPages: number}}} UserPage
 */

/** @returns {Promise<UserPage>} */
export async function getUsers({ page = 0, size = 20, sort = 'createdAt,desc' } = {}) {
  const { data } = await apiClient.get('/api/admin/users', { params: { page, size, sort } })
  return data
}

/** @returns {Promise<User>} */
export async function getUser(id) {
  const { data } = await apiClient.get(`/api/admin/users/${encodeURIComponent(id)}`)
  return data
}

/** @returns {Promise<User>} */
export async function updateUserRole(id, role) {
  const { data } = await apiClient.patch(`/api/admin/users/${encodeURIComponent(id)}/role`, { role })
  return data
}

/** Flips the user's active flag. @returns {Promise<User>} */
export async function toggleUserStatus(id) {
  const { data } = await apiClient.patch(`/api/admin/users/${encodeURIComponent(id)}/status`)
  return data
}
