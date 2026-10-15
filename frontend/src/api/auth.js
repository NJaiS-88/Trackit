import apiClient from './client'

/** @returns {Promise<{token: string, tokenType: string, expiresIn: number, user: {id: string, name: string, email: string, role: 'EMPLOYEE' | 'ENGINEER' | 'ADMIN'}}>} */
export async function register({ name, email, password, expertise }) {
  const { data } = await apiClient.post('/api/auth/register', { name, email, password, expertise })
  return data
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/api/auth/login', { email, password })
  return data
}
