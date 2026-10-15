/**
 * Labelled input / select / textarea with inline error.
 * `as` is 'input' (default), 'select' or 'textarea'; select options go in `children`.
 */
export default function FormField({ id, label, error, hint, as = 'input', children, ...controlProps }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  const Control = as

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        name={id}
        className="control"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
