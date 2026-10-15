import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/** Add future screens here; `roles` limits who sees the link (omit for everyone). */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users', roles: ['ADMIN'] },
]

export default function Sidebar() {
  const { user } = useAuth()
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role))

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
