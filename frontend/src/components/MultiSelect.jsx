import { useEffect, useId, useRef, useState } from 'react'

/**
 * Dropdown of checkboxes for picking several options.
 * `options` are `{ value, label }`; `selected` is an array of values.
 */
export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  emptyText = 'Nothing to choose from',
  disabled = false,
  invalid = false,
  size,
  ariaLabel,
}) {
  // Fixed position (from the trigger's on-screen box) so scrolling table containers can't clip the menu
  const [menuPosition, setMenuPosition] = useState(null)
  const open = menuPosition !== null
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listId = useId()

  const toggleOpen = () => {
    if (open) {
      setMenuPosition(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width })
  }

  useEffect(() => {
    if (!open) return undefined
    const close = () => setMenuPosition(null)
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close()
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') close()
    }
    const closeOnScroll = (event) => {
      if (!rootRef.current?.contains(event.target)) close()
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const selectedSet = new Set(selected)
  const allSelected = options.length > 0 && options.every((o) => selectedSet.has(o.value))

  const toggle = (value) => {
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value))
  }

  const summary = (() => {
    if (selected.length === 0) return placeholder
    const labels = options.filter((o) => selectedSet.has(o.value)).map((o) => o.label)
    return labels.length <= 2 ? labels.join(', ') : `${labels.length} selected`
  })()

  return (
    <div className={`multi-select${size === 'sm' ? ' multi-select-sm' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`control multi-select-trigger${size === 'sm' ? ' control-sm' : ''}`}
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
      >
        <span className={selected.length === 0 ? 'multi-select-placeholder' : undefined}>{summary}</span>
        <span className="multi-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          className="multi-select-menu"
          style={menuPosition}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
        >
          {options.length === 0 ? (
            <p className="multi-select-empty">{emptyText}</p>
          ) : (
            <>
              {options.length > 1 && (
                <label className="multi-select-option multi-select-all">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  Select all
                </label>
              )}
              {options.map((o) => (
                <label key={o.value} className="multi-select-option">
                  <input type="checkbox" checked={selectedSet.has(o.value)} onChange={() => toggle(o.value)} />
                  {o.label}
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
