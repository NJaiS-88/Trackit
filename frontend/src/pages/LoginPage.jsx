import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { validateLogin } from '../auth/validation'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validateLogin(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: form.email.trim(), password: form.password })
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setErrors(fieldErrors)
      setFormError(message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Report and track IT incidents"
      footer={
        <>
          New to Trackit? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert" role="alert">
            {formError}
          </div>
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoFocus
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
