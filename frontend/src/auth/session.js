const STORAGE_KEY = 'trackit.session'

/** Builds a persisted session from an AuthResponse; `expiresIn` is in seconds. */
export function createSession(authResponse) {
  return {
    token: authResponse.token,
    tokenType: authResponse.tokenType,
    expiresAt: Date.now() + authResponse.expiresIn * 1000,
    user: authResponse.user,
  }
}

export function getStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!session?.token || !session.expiresAt || session.expiresAt <= Date.now()) {
      return null
    }
    return session
  } catch {
    return null
  }
}

export function storeSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY)
}
