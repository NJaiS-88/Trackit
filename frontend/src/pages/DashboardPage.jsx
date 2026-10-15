import { useAuth } from '../auth/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <main className="page">
      <h1>Welcome, {user.name.split(' ')[0]}</h1>
      <p className="muted">Signed in as {user.email}.</p>
      <section className="placeholder-card">
        <h2>Incidents</h2>
        <p className="muted">Incident reporting and tracking will appear here.</p>
      </section>
    </main>
  )
}
