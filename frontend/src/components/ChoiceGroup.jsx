/**
 * A single-choice question rendered as selectable cards. Uses native radios, so keyboard and screen-reader
 * behaviour come for free. `onChange` receives the radio's change event (`name` / `value`), like FormField.
 * `options` is `[{ value, label, hint? }]`.
 */
export default function ChoiceGroup({ name, legend, options, value, onChange, error }) {
  const errorId = `${name}-error`

  return (
    <fieldset
      className={`choice-group ${error ? 'choice-group-invalid' : ''}`}
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((option) => {
          const id = `${name}-${option.value}`
          return (
            <label key={option.value} htmlFor={id} className="choice-option">
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
              />
              <span className="choice-label">{option.label}</span>
              {option.hint && <span className="choice-hint">{option.hint}</span>}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
