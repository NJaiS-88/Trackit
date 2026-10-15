import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../constants/roles'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <Link to="/dashboard" className="brand">
        Trackit
      </Link>
      <div className="topbar-user">
        <span>
          {user.name} <span className="role-badge">{ROLE_LABELS[user.role] ?? user.role}</span>
        </span>
        <button type="button" className="btn-secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  )
}
