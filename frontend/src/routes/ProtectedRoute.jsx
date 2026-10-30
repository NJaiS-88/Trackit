import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'

/**
 * Renders `children` (or nested routes) only for signed-in users.
 * With `allowedRoles`, users of other roles are sent to /dashboard.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isLoading, isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="page-center">
        <Spinner size={28} label="Restoring your session" />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children ?? <Outlet />
}
