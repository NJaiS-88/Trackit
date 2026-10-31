import { useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { draftIncident } from '../api/incidentApi'
import Spinner from './Spinner'

const MIN_LENGTH = 10
const MAX_LENGTH = 2000

/**
 * "Describe your problem" box: the AI turns the employee's own words into New Incident fields, passed to
 * `onDraft`. The employee reviews and edits them in the form before submitting.
 */
export default function AiDraftBox({ onDraft }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const tooShort = text.trim().length < MIN_LENGTH

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (tooShort || loading) return
    setLoading(true)
    setError(null)
    try {
      onDraft(await draftIncident(text.trim()))
    } catch (err) {
      setError(parseApiError(err).message)
      setLoading(false)
    }
  }

  return (
    <form className="card glass ai-draft" onSubmit={handleSubmit}>
      <div className="ai-draft-header">
        <h2>Describe your problem</h2>
        <p className="text-muted">
          Write it in your own words and AI will fill in the form below. You can review and edit everything before
          submitting.
        </p>
      </div>
      <textarea
        className="control"
        rows={4}
        maxLength={MAX_LENGTH}
        placeholder="e.g. Since this morning Outlook keeps asking for my password and won't connect. I need my email for a client meeting at 3pm."
        aria-label="Describe your problem"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={loading}
      />
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <div className="ai-draft-actions">
        <span className="field-hint">
          {text.length}/{MAX_LENGTH}
        </span>
        <button type="submit" className="btn btn-primary" disabled={loading || tooShort}>
          {loading && <Spinner />}
          {loading ? 'Filling the form…' : 'Fill the form with AI'}
        </button>
      </div>
    </form>
  )
}
