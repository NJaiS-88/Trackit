import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { parseApiError } from '../api/axiosInstance'
import { getIncidents } from '../api/incidentApi'
import IncidentTable from '../components/IncidentTable'
import Pagination from '../components/Pagination'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  INCIDENT_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../constants/incident'
import { useAuth } from '../hooks/useAuth'

const PAGE_SIZE = 10
const FILTER_KEYS = ['status', 'priority', 'category']

export default function Incidents() {
  const { role } = useAuth()
  // Filters live in the URL so they survive navigating to a detail page and back
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const priority = searchParams.get('priority') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Math.max(Number.parseInt(searchParams.get('page') ?? '0', 10) || 0, 0)

  const [search, setSearch] = useState('')
  // `key` records which query a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const queryKey = JSON.stringify([page, status, priority, category])

  useEffect(() => {
    let ignore = false
    getIncidents({ page, size: PAGE_SIZE, status, priority, category })
      .then((data) => {
        if (!ignore) setResult({ key: queryKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: queryKey, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [queryKey, page, status, priority, category])

  const loading = result.key !== queryKey
  const data = result.data
  const error = loading ? null : result.error

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next, { replace: true })
  }

  const handleFilterChange = (event) => {
    updateParams({ [event.target.name]: event.target.value, page: null })
  }

  const clearFilters = () => {
    setSearch('')
    updateParams(Object.fromEntries([...FILTER_KEYS, 'page'].map((key) => [key, null])))
  }

  const visibleIncidents = useMemo(() => {
    const incidents = data?.content ?? []
    const keyword = search.trim().toLowerCase()
    return keyword ? incidents.filter((incident) => incident.title.toLowerCase().includes(keyword)) : incidents
  }, [data, search])

  const hasFilters = Boolean(status || priority || category || search)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Incidents</h1>
          <p className="text-muted">
            {role === 'EMPLOYEE' && 'Incidents you have reported.'}
            {role === 'ENGINEER' && 'Incidents assigned to you.'}
            {role === 'ADMIN' && 'All incidents.'}
          </p>
        </div>
        {role === 'EMPLOYEE' && (
          <Link to="/incidents/new" className="btn btn-primary">
            New Incident
          </Link>
        )}
      </div>

      <div className="filter-bar glass">
        <select name="status" className="control" value={status} onChange={handleFilterChange} aria-label="Status">
          <option value="">All statuses</option>
          {INCIDENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          name="priority"
          className="control"
          value={priority}
          onChange={handleFilterChange}
          aria-label="Priority"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {value} · {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          name="category"
          className="control"
          value={category}
          onChange={handleFilterChange}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <input
          type="search"
          className="control filter-search"
          placeholder="Search titles on this page…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search by title"
        />
        {hasFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : (
        <>
          <IncidentTable
            incidents={visibleIncidents}
            loading={loading}
            emptyMessage={hasFilters ? 'No incidents match these filters.' : 'No incidents yet.'}
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              onPageChange={(nextPage) => updateParams({ page: nextPage > 0 ? nextPage : null })}
              disabled={loading}
            />
          )}
        </>
      )}
    </div>
  )
}
