import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as authApi from '../api/authApi'
import { parseApiError } from '../api/axiosInstance'
import AuthLayout from '../components/AuthLayout'
import FloatingField from '../components/FloatingField'
import Spinner from '../components/Spinner'
import { validateRegister } from '../utils/validation'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

export default function Register() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedRequest, setSubmittedRequest] = useState(null)

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
      const request = await authApi.requestAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setSubmittedRequest(request)
      setForm(EMPTY_FORM)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setErrors(fieldErrors)
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRequest) {
    return (
      <AuthLayout
        title="Request sent"
        subtitle="An administrator will review your request"
        footer={
          <>
            Already approved? <Link to="/login">Sign in</Link>
          </>
        }
      >
        <div className="alert alert-success" role="status">
          Your account request for <strong>{submittedRequest.email}</strong> is awaiting approval. You can sign in
          with the password you chose once an admin approves it.
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Request an account"
      subtitle="An administrator must approve your request before you can sign in"
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
          label="Work email address"
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
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Sending request…' : 'Send Request'}
        </button>
      </form>
    </AuthLayout>
  )
}
