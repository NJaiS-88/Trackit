/** `page` is zero-based, matching the backend. */
export default function Pagination({ page, totalPages, totalElements, onPageChange, disabled }) {
  const pageCount = Math.max(totalPages, 1)

  return (
    <div className="pagination">
      <span className="text-muted">{totalElements} total</span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 0}
        >
          ← Previous
        </button>
        <span className="pagination-label">
          Page {Math.min(page + 1, pageCount)} of {pageCount}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= pageCount - 1}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
