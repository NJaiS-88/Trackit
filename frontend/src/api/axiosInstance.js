import axios from 'axios'
import { clearStoredSession, getStoredSession } from '../utils/session'

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

if (!configuredApiUrl && import.meta.env.PROD) {
  console.error('VITE_API_URL is not set; API requests will fail. Set it in the hosting environment and rebuild.')
}

const instance = axios.create({
  baseURL: configuredApiUrl || 'http://localhost:8081',
  headers: { 'Content-Type': 'application/json' },
  // Render's free tier sleeps when idle; the first request can take ~50s while it wakes up
  timeout: 60000,
})

instance.interceptors.request.use((config) => {
  const session = getStoredSession()
  if (session?.token) {
    config.headers.Authorization = `${session.tokenType ?? 'Bearer'} ${session.token}`
  }
  return config
})

let unauthorizedHandler = null

/**
 * Registers the callback run when an authenticated request returns 401 (expired/revoked token).
 * AuthContext uses it to reset state so the router redirects to /login without a full reload.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearStoredSession()
      if (unauthorizedHandler) unauthorizedHandler()
      else window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

/** Normalizes an axios error into `{ status, message, fieldErrors }` using the backend's ApiErrorResponse. */
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

export default instance
