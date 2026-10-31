import { useId, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { downloadAttachment } from '../api/workApi'
import { formatBytes } from '../utils/format'

/** "N files" toggle that expands into the downloadable reference files attached to a piece of work. */
export default function AttachmentList({ attachments }) {
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState(null)
  const listId = useId()

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
      <button
        type="button"
        className="attachment-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
      >
        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
        <span className={`attachment-caret${open ? ' attachment-caret-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul id={listId}>
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
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
