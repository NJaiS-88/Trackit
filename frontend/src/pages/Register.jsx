import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as authApi from '../api/authApi'
import { parseApiError } from '../api/axiosInstance'
import AuthLayout from '../components/AuthLayout'
import FloatingField from '../components/FloatingField'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'
import { parseExpertise, validateRegister } from '../utils/validation'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '', expertise: '' }

export default function Register() {
  const { login } = useAuth()
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
      const response = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        expertise: parseExpertise(form.expertise),
      })
      login(response)
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
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}
        <FloatingField
          id="name"
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          autoFocus
        />
        <FloatingField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FloatingField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />
        <FloatingField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <FloatingField
          id="expertise"
          label="Expertise (optional, comma-separated)"
          value={form.expertise}
          onChange={handleChange}
          error={errors.expertise}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}
