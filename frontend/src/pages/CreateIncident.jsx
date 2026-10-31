import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { createIncident } from '../api/incidentApi'
import AiDraftBox from '../components/AiDraftBox'
import ChoiceGroup from '../components/ChoiceGroup'
import FormField from '../components/FormField'
import PriorityBadge from '../components/PriorityBadge'
import Spinner from '../components/Spinner'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  IMPACT_OPTIONS,
  PRIORITY_LABELS,
  URGENCY_OPTIONS,
} from '../constants/incident'
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
  // The AI fills the form once per ticket; Start over brings the box back
  const [aiUsed, setAiUsed] = useState(false)
  // Bumped by Start over so the AI box also forgets any text typed into it
  const [resetCount, setResetCount] = useState(0)
  const expectedPriority = previewPriority(form.impact, form.urgency)
  const hasInput = aiUsed || Object.values(form).some((value) => value.trim() !== '')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleDraft = (draft) => {
    setForm({
      title: draft.title ?? '',
      description: draft.description ?? '',
      category: draft.category ?? '',
      affectedService: draft.affectedService ?? '',
      impact: draft.impact ?? '',
      urgency: draft.urgency ?? '',
    })
    setErrors({})
    setFormError(null)
    setAiUsed(true)
  }

  const handleStartOver = () => {
    if (hasInput && !window.confirm('Clear everything and start again?')) return
    setForm(EMPTY_FORM)
    setErrors({})
    setFormError(null)
    setAiUsed(false)
    setResetCount((count) => count + 1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validateIncident(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    // P1 is reserved for company-wide outages; make inflating to it a deliberate choice
    if (
      expectedPriority === 'P1' &&
      !window.confirm(
        'You said several teams or the whole company are affected and people are completely blocked. ' +
          'This will be logged as Critical (P1), the highest priority. Is that right?',
      )
    ) {
      return
    }

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
        <button type="button" className="btn btn-ghost" onClick={handleStartOver} disabled={submitting || !hasInput}>
          ↺ Start over
        </button>
      </div>

      {aiUsed ? (
        <div className="alert alert-success ai-draft-note" role="status">
          Filled in by AI from your description. Review and edit anything before submitting.
        </div>
      ) : (
        <AiDraftBox key={resetCount} onDraft={handleDraft} />
      )}

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

        <ChoiceGroup
          name="impact"
          legend="Who is affected?"
          options={IMPACT_OPTIONS}
          value={form.impact}
          onChange={handleChange}
          error={errors.impact}
        />

        <ChoiceGroup
          name="urgency"
          legend="Can you keep working?"
          options={URGENCY_OPTIONS}
          value={form.urgency}
          onChange={handleChange}
          error={errors.urgency}
        />

        <div className="span-2 priority-preview">
          <p className="field-hint">Priority is worked out from your two answers above.</p>
          {expectedPriority && (
            <p className="priority-preview-result">
              This will be logged as{' '}
              <PriorityBadge priority={expectedPriority} label={PRIORITY_LABELS[expectedPriority]} />
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
