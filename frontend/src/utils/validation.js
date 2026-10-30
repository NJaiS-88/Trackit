// Mirrors the backend's request DTO constraints so users get instant feedback.

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

export function validateRegister({ name, email, password, confirmPassword }) {
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
  return errors
}

export function validateIncident({ title, description, category, affectedService, impact, urgency }) {
  const errors = {}
  const trimmedTitle = title.trim()
  if (!trimmedTitle) errors.title = 'Title is required'
  else if (trimmedTitle.length > 120) errors.title = 'Title must be at most 120 characters'

  const trimmedDescription = description.trim()
  if (!trimmedDescription) errors.description = 'Description is required'
  else if (trimmedDescription.length > 3000) {
    errors.description = 'Description must be at most 3000 characters'
  }

  if (!category) errors.category = 'Category is required'
  if (affectedService.trim().length > 120) {
    errors.affectedService = 'Affected service must be at most 120 characters'
  }
  if (!impact) errors.impact = 'Impact is required'
  if (!urgency) errors.urgency = 'Urgency is required'
  return errors
}
