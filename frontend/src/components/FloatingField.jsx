/** Input whose label floats above the value once focused or filled. */
export default function FloatingField({ id, label, error, ...inputProps }) {
  const errorId = `${id}-error`
  return (
    <div className="floating-field">
      <input
        id={id}
        name={id}
        placeholder=" "
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      <label htmlFor={id}>{label}</label>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
