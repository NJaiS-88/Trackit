import axiosInstance from './axiosInstance'

/**
 * @typedef {'EMPLOYEE' | 'ENGINEER' | 'ADMIN'} Role
 * @typedef {{id: string, name: string, email: string, role: Role}} UserSummary
 * @typedef {import('./accountRequestApi').AccountRequest} AccountRequest
 */

/** Sets the session cookies. @returns {Promise<UserSummary>} */
export async function login(data) {
  const { data: user } = await axiosInstance.post('/api/auth/login', data)
  return user
}

/** Revokes the session and clears its cookies. */
export async function logout() {
  await axiosInstance.post('/api/auth/logout')
}

/** The signed-in user; rejects with 401 when there is no session. @returns {Promise<UserSummary>} */
export async function getCurrentUser() {
  const { data: user } = await axiosInstance.get('/api/auth/me')
  return user
}

/** Files a sign-up for admin approval; no session is created. @returns {Promise<AccountRequest>} */
export async function requestAccount(data) {
  const { data: response } = await axiosInstance.post('/api/auth/register', data)
  return response
}
