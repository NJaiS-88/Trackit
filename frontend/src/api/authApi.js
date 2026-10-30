import axiosInstance from './axiosInstance'

/**
 * @typedef {'EMPLOYEE' | 'ENGINEER' | 'ADMIN'} Role
 * @typedef {{token: string, tokenType: string, expiresIn: number, user: {id: string, name: string, email: string, role: Role}}} AuthResponse
 * @typedef {import('./accountRequestApi').AccountRequest} AccountRequest
 */

/** @returns {Promise<AuthResponse>} */
export async function login(data) {
  const { data: response } = await axiosInstance.post('/api/auth/login', data)
  return response
}

/** Files a sign-up for admin approval; no session is created. @returns {Promise<AccountRequest>} */
export async function requestAccount(data) {
  const { data: response } = await axiosInstance.post('/api/auth/register', data)
  return response
}
