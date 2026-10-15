/** `page` is zero-based, matching the backend. */
export default function Pagination({ page, totalPages, totalElements, onPageChange, disabled }) {
  if (totalPages <= 1) {
    return <p className="pagination-summary muted">{totalElements} total</p>
  }

  return (
    <div className="pagination">
      <span className="pagination-summary muted">
        Page {page + 1} of {totalPages} · {totalElements} total
      </span>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  )
}
