import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

if (!configuredApiUrl && import.meta.env.PROD) {
  console.error('VITE_API_URL is not set; API requests will fail. Set it in the hosting environment and rebuild.')
}

// Tokens live in HttpOnly cookies on the API's domain: scripts never see them, the browser just sends them.
const instance = axios.create({
  baseURL: configuredApiUrl || 'http://localhost:8081',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // Render's free tier sleeps when idle; the first request can take ~50s while it wakes up
  timeout: 60000,
})

// A 401 from these means bad credentials or no session, not an expired access token
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout']

const REFRESH_LOCK = 'trackit-auth-refresh'
const REFRESHED_AT_KEY = 'trackit.refreshedAt'
// Cookies are shared by every tab, so a refresh another tab just made already covers this one
const RECENT_REFRESH_MS = 10_000

let refreshRequest = null

async function refreshIfStale() {
  const refreshedAt = Number(localStorage.getItem(REFRESHED_AT_KEY))
  if (Date.now() - refreshedAt < RECENT_REFRESH_MS) return
  try {
    await instance.post('/api/auth/refresh')
  } catch (error) {
    // 409: a concurrent request rotated the token a moment ago and its response set the new cookies
    if (error.response?.status !== 409) throw error
  }
  localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()))
}

/** One refresh at a time: shared within this tab, and serialized across tabs with the Web Locks API. */
function refreshSession() {
  if (!refreshRequest) {
    const run = navigator.locks ? navigator.locks.request(REFRESH_LOCK, refreshIfStale) : refreshIfStale()
    refreshRequest = run.finally(() => {
      refreshRequest = null
    })
  }
  return refreshRequest
}

let sessionEndedHandler = null

/**
 * Registers the callback run when the session can no longer be refreshed (expired, revoked, user deactivated).
 * AuthContext uses it to reset state so the router redirects to /login without a full reload.
 */
export function onSessionEnded(handler) {
  sessionEndedHandler = handler
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null
  }
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    if (!config || !response) return Promise.reject(error)

    const path = config.url ?? ''
    // 403: the access token may carry a role an admin has since changed; a refresh re-reads it from the database
    const staleRole = response.status === 403 && response.data?.code !== 'ORIGIN_NOT_ALLOWED'
    if (
      (response.status === 401 || staleRole) &&
      !config.authRetried &&
      !NO_REFRESH_PATHS.some((p) => path.startsWith(p))
    ) {
      config.authRetried = true
      try {
        await refreshSession()
      } catch {
        if (sessionEndedHandler) sessionEndedHandler()
        else window.location.assign('/login')
        return Promise.reject(error)
      }
      return instance(config)
    }

    return Promise.reject(error)
  },
)

/** Normalizes an axios error into `{ status, code, message, fieldErrors }` using the backend's ApiErrorResponse. */
export function parseApiError(error) {
  if (!error.response) {
    return {
      status: 0,
      code: null,
      message: 'Cannot reach the server. Check that the backend is running.',
      fieldErrors: {},
    }
  }
  const { status, data } = error.response
  return {
    status,
    code: data?.code ?? null,
    message: data?.message ?? 'Something went wrong. Please try again.',
    fieldErrors: data?.fieldErrors ?? {},
  }
}

export default instance
