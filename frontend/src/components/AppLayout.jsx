import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />}
      <div className="app-main">
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
