import { useCallback, useEffect, useMemo, useState } from 'react'
import { onUnauthorized } from '../api/axiosInstance'
import { clearStoredSession, createSession, getStoredSession, storeSession } from '../utils/session'
import { AuthContext } from './auth-context'

const MAX_TIMEOUT_MS = 2_147_483_647

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession())

  /** Stores the AuthResponse returned by authApi.login. */
  const login = useCallback((authResponse) => {
    const next = createSession(authResponse)
    storeSession(next)
    setSession(next)
    return next.user
  }, [])

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  useEffect(() => onUnauthorized(logout), [logout])

  // Drop the session as soon as the token expires, even if no request is made.
  // setTimeout fires immediately for delays above 2^31-1 ms, hence the clamp.
  useEffect(() => {
    if (!session) return undefined
    const delay = Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMEOUT_MS)
    const timeout = setTimeout(() => {
      if (Date.now() >= session.expiresAt) logout()
      else setSession({ ...session })
    }, delay)
    return () => clearTimeout(timeout)
  }, [session, logout])

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      role: session?.user?.role ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
