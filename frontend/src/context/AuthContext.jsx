import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '../api/authApi'
import { onSessionEnded } from '../api/axiosInstance'
import { AuthContext } from './auth-context'

const CHANNEL_NAME = 'trackit-auth'

/**
 * The session itself lives in HttpOnly cookies; this only tracks who is signed in.
 * `status` is 'loading' until the first /api/auth/me answers.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })
  const channelRef = useRef(null)

  const endSession = useCallback(() => {
    setState({ status: 'anonymous', user: null })
  }, [])

  useEffect(() => {
    let ignore = false
    authApi
      .getCurrentUser()
      .then((user) => {
        if (!ignore) setState({ status: 'authenticated', user })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'anonymous', user: null })
      })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => onSessionEnded(endSession), [endSession])

  // Keep other tabs in step: the cookies are shared, so their UI should be too
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    channel.onmessage = ({ data }) => {
      if (data?.type === 'logout') endSession()
      if (data?.type === 'login') setState({ status: 'authenticated', user: data.user })
    }
    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [endSession])

  /** Records the user returned by authApi.login (the cookies are already set). */
  const login = useCallback((user) => {
    setState({ status: 'authenticated', user })
    channelRef.current?.postMessage({ type: 'login', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Clear local state regardless; the refresh token expires on its own
    }
    endSession()
    channelRef.current?.postMessage({ type: 'logout' })
  }, [endSession])

  const value = useMemo(
    () => ({
      user: state.user,
      role: state.user?.role ?? null,
      isLoading: state.status === 'loading',
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
    }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
