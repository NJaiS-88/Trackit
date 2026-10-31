import { useEffect, useRef, useState } from 'react'
import { parseApiError } from '../api/axiosInstance'
import { getTicketChat, sendTicketMessage } from '../api/ticketChatApi'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'
import Spinner from './Spinner'

const MAX_LENGTH = 2000

const ROLE_LABELS = {
  REPORTER: 'Reporter',
  ASSIGNEE: 'Assigned employee',
}

/**
 * Conversation between a ticket's reporter and its assigned employees; Leads and admins only read.
 * Not live: it loads when opened, after sending, and on Refresh.
 */
export default function TicketChat({ incidentId }) {
  const { user } = useAuth()
  const [reloadCount, setReloadCount] = useState(0)
  // `key` records which request a result belongs to; a mismatch means a fetch is in flight
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const listRef = useRef(null)
  const requestKey = `${incidentId}:${reloadCount}`

  useEffect(() => {
    let ignore = false
    getTicketChat(incidentId)
      .then((data) => {
        if (!ignore) setResult({ key: requestKey, data, error: null })
      })
      .catch((err) => {
        if (!ignore) setResult({ key: requestKey, data: null, error: parseApiError(err).message })
      })
    return () => {
      ignore = true
    }
  }, [incidentId, requestKey])

  const loading = result.key !== requestKey
  const chat = result.data
  const messages = chat?.messages ?? []

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length])

  const handleSend = async (event) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(null)
    try {
      const message = await sendTicketMessage(incidentId, body)
      setResult((prev) => ({ ...prev, data: { ...prev.data, messages: [...prev.data.messages, message] } }))
      setDraft('')
    } catch (err) {
      setSendError(parseApiError(err).message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handleSend(event)
  }

  return (
    <section className="card glass ticket-chat" aria-label="Ticket messages">
      <div className="section-header">
        <h2>Messages</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setReloadCount((count) => count + 1)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {result.error && !loading ? (
        <div className="alert alert-error" role="alert">
          {result.error}
        </div>
      ) : (
        <>
          <ol className="chat-list" ref={listRef}>
            {loading && !chat && (
              <li className="chat-empty">
                <Spinner size={18} label="Loading messages" />
              </li>
            )}
            {chat && messages.length === 0 && <li className="chat-empty">No messages yet.</li>}
            {messages.map((m) => {
              const mine = m.authorId === user?.id
              return (
                <li key={m.id} className={`chat-message${mine ? ' chat-message-mine' : ''}`}>
                  <div className="chat-meta">
                    <span className="chat-author">{mine ? 'You' : (m.authorName ?? 'Unknown user')}</span>
                    <span className="chat-role">{ROLE_LABELS[m.authorRole] ?? m.authorRole}</span>
                    <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
                  </div>
                  <p className="chat-body">{m.body}</p>
                </li>
              )
            })}
          </ol>

          {chat &&
            (chat.canPost ? (
              <form className="chat-composer" onSubmit={handleSend}>
                <textarea
                  className="control"
                  rows={3}
                  maxLength={MAX_LENGTH}
                  placeholder="Write a message…"
                  aria-label="Message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                {sendError && <p className="field-error">{sendError}</p>}
                <div className="chat-composer-actions">
                  <span className="field-hint">
                    {draft.length}/{MAX_LENGTH} · Ctrl+Enter to send
                  </span>
                  <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
                    {sending && <Spinner />}
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="chat-readonly text-muted">{chat.postingDisabledReason}</p>
            ))}
        </>
      )}
    </section>
  )
}
