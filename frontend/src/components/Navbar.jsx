import { useAuth } from '../hooks/useAuth'
import { ROLE_LABELS } from '../constants/roles'
import DeadlineChip from './DeadlineChip'

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { user, role } = useAuth()
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="navbar">
      <button
        type="button"
        className="hamburger"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="navbar-user">
        {role === 'EMPLOYEE' && <DeadlineChip />}
        <div className="navbar-user-text">
          <span className="navbar-user-name">{user.name}</span>
          <span className={`role-badge role-${role.toLowerCase()}`}>{ROLE_LABELS[role] ?? role}</span>
        </div>
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
      </div>
    </header>
  )
}
