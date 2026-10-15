import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { onUnauthorized } from '../api/client'
import { AuthContext } from './context'
import { clearStoredSession, createSession, getStoredSession, storeSession } from './session'

const MAX_TIMEOUT_MS = 2_147_483_647

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession())

  const startSession = useCallback((authResponse) => {
    const next = createSession(authResponse)
    storeSession(next)
    setSession(next)
    return next.user
  }, [])

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  const login = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  )

  const register = useCallback(
    async (details) => startSession(await authApi.register(details)),
    [startSession],
  )

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
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
