import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AccountRequests from './pages/AccountRequests'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminProjects from './pages/AdminProjects'
import AdminUsers from './pages/AdminUsers'
import AdminWork from './pages/AdminWork'
import CreateIncident from './pages/CreateIncident'
import Dashboard from './pages/Dashboard'
import Departments from './pages/Departments'
import IncidentDetail from './pages/IncidentDetail'
import Incidents from './pages/Incidents'
import Login from './pages/Login'
import Register from './pages/Register'
import Team from './pages/Team'
import TeamAnalytics from './pages/TeamAnalytics'
import TeamWork from './pages/TeamWork'
import GuestRoute from './routes/GuestRoute'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Every signed-in screen shares the sidebar + navbar shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route
          path="/incidents/new"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <CreateIncident />
            </ProtectedRoute>
          }
        />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route
          path="/team"
          element={
            <ProtectedRoute allowedRoles={['ENGINEER']}>
              <Team />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/work"
          element={
            <ProtectedRoute allowedRoles={['ENGINEER']}>
              <TeamWork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/analytics"
          element={
            <ProtectedRoute allowedRoles={['ENGINEER']}>
              <TeamAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AccountRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/work"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminWork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
