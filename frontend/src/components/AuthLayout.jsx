export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <span className="brand">Trackit</span>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </header>
        {children}
        {footer && <footer className="auth-footer">{footer}</footer>}
      </section>
    </main>
  )
}
