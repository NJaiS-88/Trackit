import { useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { downloadAttachment } from '../api/workApi'
import { formatBytes } from '../utils/format'

/** Downloadable reference files attached to a piece of work. */
export default function AttachmentList({ attachments }) {
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState(null)

  if (!attachments || attachments.length === 0) return null

  const handleDownload = async (attachment) => {
    setError(null)
    setPendingId(attachment.id)
    try {
      await downloadAttachment(attachment)
    } catch (err) {
      setError(`Couldn't download ${attachment.name}: ${parseApiError(err).message}`)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="attachment-list">
      <span className="attachment-list-label">
        <span aria-hidden="true">📎</span> {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
      </span>
      <ul>
        {attachments.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="attachment-link"
              onClick={() => handleDownload(a)}
              disabled={pendingId === a.id}
              title={`Download ${a.path}`}
            >
              {a.path}
            </button>
            <span className="attachment-size">
              {pendingId === a.id ? 'Downloading…' : formatBytes(a.size)}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
