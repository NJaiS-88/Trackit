import axios from 'axios'
import { getStoredSession } from '../auth/session'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8081',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession()
  if (session?.token) {
    config.headers.Authorization = `${session.tokenType ?? 'Bearer'} ${session.token}`
  }
  return config
})

let unauthorizedHandler = null

/** Registers a callback fired when an authenticated request comes back 401 (expired/revoked token). */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

/**
 * Normalizes an axios error into `{ status, message, fieldErrors }` using the backend's ApiErrorResponse shape.
 */
export function parseApiError(error) {
  if (!error.response) {
    return {
      status: 0,
      message: 'Cannot reach the server. Check that the backend is running.',
      fieldErrors: {},
    }
  }
  const { status, data } = error.response
  return {
    status,
    message: data?.message ?? 'Something went wrong. Please try again.',
    fieldErrors: data?.fieldErrors ?? {},
  }
}

export default apiClient
