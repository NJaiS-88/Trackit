import axiosInstance from './axiosInstance'

/**
 * @typedef {'EMPLOYEE' | 'ENGINEER' | 'ADMIN'} Role
 * @typedef {{token: string, tokenType: string, expiresIn: number, user: {id: string, name: string, email: string, role: Role}}} AuthResponse
 */

/** @returns {Promise<AuthResponse>} */
export async function login(data) {
  const { data: response } = await axiosInstance.post('/api/auth/login', data)
  return response
}

/** @returns {Promise<AuthResponse>} */
export async function register(data) {
  const { data: response } = await axiosInstance.post('/api/auth/register', data)
  return response
}
