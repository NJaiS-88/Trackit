import { useEffect, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { createDepartment, getDepartments } from '../api/departmentApi'
import FormField from '../components/FormField'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import { formatDate } from '../utils/format'
import { validateDepartment } from '../utils/validation'

const PAGE_SIZE = 20
const COLUMN_COUNT = 3
const EMPTY_FORM = { name: '', description: '' }

export default function Departments() {
  const [page, setPage] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const requestKey = `${page}:${reloadCount}`

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let ignore = false
    getDepartments({ page, size: PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: requestKey, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [requestKey, page])

  const loading = result.key !== requestKey
  const data = result.data
  const loadError = loading ? null : result.error

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const validationErrors = validateDepartment(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const created = await createDepartment({
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      setForm(EMPTY_FORM)
      setSuccessMessage(`Created the ${created.name} department.`)
      setPage(0)
      setReloadCount((count) => count + 1)
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error)
      setErrors(fieldErrors)
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const departments = data?.content ?? []
  const pageInfo = data?.page

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p className="text-muted">Create the departments people and incidents belong to.</p>
        </div>
      </div>

      <form className="card glass form-grid" onSubmit={handleSubmit} noValidate>
        <h2 className="span-2">New department</h2>
        {formError && (
          <div className="alert alert-error span-2" role="alert">
            {formError}
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success span-2" role="status">
            {successMessage}
          </div>
        )}

        <div className="span-2">
          <FormField
            id="name"
            label="Name"
            placeholder="e.g. Finance"
            maxLength={80}
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
        </div>

        <div className="span-2">
          <FormField
            id="description"
            label="Description (optional)"
            as="textarea"
            rows={3}
            maxLength={300}
            placeholder="What this department is responsible for"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            hint={`${form.description.length}/300`}
          />
        </div>

        <div className="form-actions span-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? 'Creating…' : 'Create Department'}
          </button>
        </div>
      </form>

      <section className="section">
        <div className="section-header">
          <h2>All departments</h2>
        </div>

        {loadError ? (
          <div className="alert alert-error" role="alert">
            {loadError}
          </div>
        ) : (
          <div className="table-card glass">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && departments.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="table-empty">
                      <Spinner size={20} label="Loading departments" />
                    </td>
                  </tr>
                )}
                {!loading && departments.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="table-empty">
                      No departments yet. Create the first one above.
                    </td>
                  </tr>
                )}
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td className="cell-muted">{d.description ?? '—'}</td>
                    <td className="cell-muted">{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageInfo && (
          <Pagination
            page={pageInfo.number}
            totalPages={pageInfo.totalPages}
            totalElements={pageInfo.totalElements}
            onPageChange={setPage}
            disabled={loading}
          />
        )}
      </section>
    </div>
  )
}
