import { useEffect, useRef, useState } from 'react'
import { formatBytes } from '../utils/format'

// Mirror the API's limits so oversized picks are rejected before uploading
export const MAX_ATTACHMENTS = 20
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 50 * 1024 * 1024

const pathOf = (file) => file.webkitRelativePath || file.name

/** Pick individual files or a whole folder (keeping its paths); `files` is the chosen File[]. */
export default function AttachmentPicker({ files, onChange, disabled }) {
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [error, setError] = useState(null)

  // Not a standard React prop, so set it directly
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  const addFiles = (picked) => {
    setError(null)
    const known = new Set(files.map((f) => `${pathOf(f)}:${f.size}`))
    const problems = []
    const next = [...files]
    let total = files.reduce((sum, f) => sum + f.size, 0)

    for (const file of picked) {
      const key = `${pathOf(file)}:${file.size}`
      if (known.has(key)) continue
      if (file.size === 0) {
        problems.push(`${pathOf(file)} is empty`)
      } else if (file.size > MAX_FILE_BYTES) {
        problems.push(`${pathOf(file)} is larger than 10 MB`)
      } else if (next.length >= MAX_ATTACHMENTS) {
        problems.push(`only ${MAX_ATTACHMENTS} files can be attached`)
        break
      } else if (total + file.size > MAX_TOTAL_BYTES) {
        problems.push('attachments can total at most 50 MB')
        break
      } else {
        next.push(file)
        known.add(key)
        total += file.size
      }
    }

    onChange(next)
    if (problems.length > 0) setError(`Some files were skipped: ${problems.join('; ')}.`)
  }

  const handlePick = (event) => {
    addFiles([...event.target.files])
    // Allow picking the same file again after removing it
    event.target.value = ''
  }

  const removeFile = (index) => {
    setError(null)
    onChange(files.filter((_, i) => i !== index))
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="attachment-picker">
      <div className="attachment-picker-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
        >
          ＋ Add files
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => folderInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
        >
          ＋ Add folder
        </button>
        <span className="field-hint">Up to {MAX_ATTACHMENTS} files, 10 MB each</span>
      </div>

      <input ref={fileInputRef} type="file" multiple hidden onChange={handlePick} />
      <input ref={folderInputRef} type="file" multiple hidden onChange={handlePick} />

      {files.length > 0 && (
        <>
          <ul className="attachment-picker-list">
            {files.map((file, index) => (
              <li key={`${pathOf(file)}:${file.size}`}>
                <span className="attachment-picker-name" title={pathOf(file)}>
                  {pathOf(file)}
                </span>
                <span className="attachment-size">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  aria-label={`Remove ${pathOf(file)}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="field-hint attachment-picker-total">
            {files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(totalSize)}
          </p>
        </>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
