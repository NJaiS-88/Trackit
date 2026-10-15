export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-card glass">
        <header className="auth-header">
          <div className="wordmark">
            <span className="logo-mark" aria-hidden="true">T</span>
            <span className="logo-text">Trackit</span>
          </div>
          <h1>{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </header>
        {children}
        {footer && <footer className="auth-footer">{footer}</footer>}
      </section>
    </main>
  )
}
