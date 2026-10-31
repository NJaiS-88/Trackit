import Timestamp from './Timestamp'

/** One-line "how this ticket reached me" label for the Lead's ticket list; nothing if never passed. */
export function PassedFrom({ transfer }) {
  if (!transfer) return null
  return (
    <div className="passed-from" title={transfer.note ?? undefined}>
      <span aria-hidden="true">↪</span> Passed from <strong>{transfer.fromDepartmentName ?? 'another department'}</strong>
      {transfer.passedByName && <> by {transfer.passedByName}</>}
      {transfer.note && <span className="passed-from-note">“{transfer.note}”</span>}
    </div>
  )
}

/** Every pass between departments, oldest first, for the ticket page. Renders nothing if never passed. */
export default function TransferHistory({ transfers }) {
  if (!transfers || transfers.length === 0) return null
  return (
    <section className="card glass">
      <h2>Routing history</h2>
      <ol className="transfer-history">
        {transfers.map((t) => (
          <li key={t.id}>
            <div className="transfer-history-head">
              <span>
                <strong>{t.fromDepartmentName ?? 'Unknown department'}</strong> →{' '}
                <strong>{t.toDepartmentName ?? 'Unknown department'}</strong>
                {t.passedByName && <span className="text-muted"> · passed by {t.passedByName}</span>}
              </span>
              {t.followedRecommendation && <span className="transfer-ai-tag">Followed AI suggestion</span>}
            </div>
            {t.note && <p className="transfer-history-note">“{t.note}”</p>}
            <div className="transfer-history-time">
              <Timestamp value={t.createdAt} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
