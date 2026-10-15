// Mirrors the backend's RegisterRequest / LoginRequest constraints so users get instant feedback.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email) {
  const value = email.trim()
  if (!value) return 'Email is required'
  if (value.length > 254) return 'Email must be at most 254 characters'
  if (!EMAIL_PATTERN.test(value)) return 'Email must be a valid email address'
  return null
}

export function validateLogin({ email, password }) {
  const errors = {}
  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError
  if (!password) errors.password = 'Password is required'
  return errors
}

/** Splits a comma-separated input into trimmed, non-empty, de-duplicated entries. */
export function parseExpertise(input) {
  return [...new Set(input.split(',').map((item) => item.trim()).filter(Boolean))]
}

export function validateRegister({ name, email, password, confirmPassword, expertise }) {
  const errors = {}
  const trimmedName = name.trim()
  if (!trimmedName) errors.name = 'Name is required'
  else if (trimmedName.length < 2 || trimmedName.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters'
  }

  const emailError = validateEmail(email)
  if (emailError) errors.email = emailError

  if (!password) errors.password = 'Password is required'
  else if (password.length < 8 || password.length > 72) {
    errors.password = 'Password must be between 8 and 72 characters'
  }

  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'

  const expertiseItems = parseExpertise(expertise ?? '')
  if (expertiseItems.length > 20) errors.expertise = 'At most 20 expertise entries are allowed'
  else if (expertiseItems.some((item) => item.length > 50)) {
    errors.expertise = 'Expertise entries must be at most 50 characters'
  }
  return errors
}
