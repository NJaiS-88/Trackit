import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { parseExpertise, validateRegister } from '../auth/validation'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '', expertise: '' }

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
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

    const validationErrors = validateRegister(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        expertise: parseExpertise(form.expertise),
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setErrors(fieldErrors)
      setFormError(message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="New accounts start as employees"
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
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
          id="name"
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          autoFocus
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <FormField
          id="expertise"
          label="Expertise (optional)"
          placeholder="e.g. Networking, Hardware, Email"
          value={form.expertise}
          onChange={handleChange}
          error={errors.expertise}
        />
        <p className="field-hint muted">Comma-separated. Used if you are made an engineer.</p>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
