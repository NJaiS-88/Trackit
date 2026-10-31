import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * A dialog over the whole app with a dimmed backdrop. Closes on Escape, a click on the backdrop or the close
 * button, except while `busy` (e.g. a request is running). Page scrolling is locked while it is open.
 * `footer` holds the action buttons.
 */
export default function Modal({ title, onClose, busy = false, children, footer }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  // Lock page scroll and move focus into the dialog; give both back on close
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [])

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !busy) onClose()
  }

  return createPortal(
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} tabIndex={-1}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
