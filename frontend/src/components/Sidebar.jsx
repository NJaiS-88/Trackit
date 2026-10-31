import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** `roles` limits who sees a link (omit for everyone). */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/incidents/new', label: 'New Incident', roles: ['EMPLOYEE'] },
  { to: '/team', label: 'My Team', roles: ['ENGINEER'] },
  { to: '/team/work', label: 'Work Assignments', roles: ['ENGINEER'] },
  { to: '/team/analytics', label: 'Team Analytics', roles: ['ENGINEER'] },
  { to: '/admin/users', label: 'Admin Users', roles: ['ADMIN'] },
  { to: '/admin/requests', label: 'Account Requests', roles: ['ADMIN'] },
  { to: '/admin/departments', label: 'Departments', roles: ['ADMIN'] },
  { to: '/admin/projects', label: 'Projects', roles: ['ADMIN'] },
  { to: '/admin/work', label: 'Work Overview', roles: ['ADMIN'] },
  { to: '/admin/analytics', label: 'Analytics', roles: ['ADMIN'] },
]

export default function Sidebar({ open, onNavigate }) {
  const { role, logout } = useAuth()
  const { pathname } = useLocation()
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  // "/incidents" should stay highlighted on detail pages but not on "/incidents/new"
  const isActive = (to) =>
    to === '/incidents'
      ? pathname === '/incidents' || (pathname.startsWith('/incidents/') && pathname !== '/incidents/new')
      : pathname === to

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-logo">
        <span className="logo-mark" aria-hidden="true">T</span>
        <span className="logo-text">Trackit</span>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={() => (isActive(item.to) ? 'active' : undefined)}
            onClick={onNavigate}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar-logout" onClick={logout}>
        Logout
      </button>
    </aside>
  )
}
