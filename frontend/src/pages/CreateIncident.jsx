import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { createIncident } from '../api/incidentApi'
import FormField from '../components/FormField'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import { CATEGORIES, CATEGORY_LABELS, LEVEL_LABELS, LEVELS, PRIORITY_LABELS } from '../constants/incident'
import { previewPriority } from '../utils/priorityCalculator'
import { validateIncident } from '../utils/validation'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  affectedService: '',
  impact: '',
  urgency: '',
}

export default function CreateIncident() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const expectedPriority = previewPriority(form.impact, form.urgency)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validateIncident(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const created = await createIncident({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        affectedService: form.affectedService.trim() || null,
        impact: form.impact,
        urgency: form.urgency,
      })
      navigate(`/incidents/${created.id}`)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setErrors(fieldErrors)
      setFormError(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-narrow">
      <Link to="/incidents" className="back-link">
        ← Back to incidents
      </Link>
      <div className="page-header">
        <div>
          <h1>New Incident</h1>
          <p className="text-muted">Describe the problem so the right engineer can pick it up quickly.</p>
        </div>
      </div>

      <form className="card glass form-grid" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert alert-error span-2" role="alert">
            {formError}
          </div>
        )}

        <div className="span-2">
          <FormField
            id="title"
            label="Title"
            placeholder="e.g. VPN disconnects every few minutes"
            maxLength={120}
            value={form.title}
            onChange={handleChange}
            error={errors.title}
            autoFocus
          />
        </div>

        <div className="span-2">
          <FormField
            id="description"
            label="Description"
            as="textarea"
            rows={5}
            maxLength={3000}
            placeholder="What happened, when it started, and who is affected"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            hint={`${form.description.length}/3000`}
          />
        </div>

        <FormField
          id="category"
          label="Category"
          as="select"
          value={form.category}
          onChange={handleChange}
          error={errors.category}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </FormField>

        <FormField
          id="affectedService"
          label="Affected Service (optional)"
          placeholder="e.g. Email, Payroll portal"
          maxLength={120}
          value={form.affectedService}
          onChange={handleChange}
          error={errors.affectedService}
        />

        <FormField id="impact" label="Impact" as="select" value={form.impact} onChange={handleChange} error={errors.impact}>
          <option value="">Select impact</option>
          {LEVELS.map((value) => (
            <option key={value} value={value}>
              {LEVEL_LABELS[value]}
            </option>
          ))}
        </FormField>

        <FormField
          id="urgency"
          label="Urgency"
          as="select"
          value={form.urgency}
          onChange={handleChange}
          error={errors.urgency}
        >
          <option value="">Select urgency</option>
          {LEVELS.map((value) => (
            <option key={value} value={value}>
              {LEVEL_LABELS[value]}
            </option>
          ))}
        </FormField>

        <div className="span-2 priority-preview">
          <p className="field-hint">Priority is automatically calculated from your Impact and Urgency selection.</p>
          {expectedPriority && (
            <p className="priority-preview-result">
              Expected priority: <PriorityBadge priority={expectedPriority} label={PRIORITY_LABELS[expectedPriority]} />
            </p>
          )}
        </div>

        <div className="form-actions span-2">
          <Link to="/incidents" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? 'Submitting…' : 'Submit Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}
