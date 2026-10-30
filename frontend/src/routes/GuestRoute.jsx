import { Navigate, Outlet } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'

/** Keeps signed-in users away from the login/register pages. */
export default function GuestRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) {
    return (
      <div className="page-center">
        <Spinner size={28} label="Restoring your session" />
      </div>
    )
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
