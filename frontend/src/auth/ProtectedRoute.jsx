import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/** Renders child routes only for signed-in users; optionally restricts to specific roles. */
export function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

/** Keeps signed-in users away from the login/register pages. */
export function GuestRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
