import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMyWork } from '../api/workApi'
import { urgentWork } from '../constants/work'
import { useNow } from '../hooks/useNow'

const REFRESH_MS = 5 * 60_000

/** Navbar alert for employees: how much of their work is overdue or due soon, linking to the dashboard. */
export default function DeadlineChip() {
  const now = useNow()
  const { pathname } = useLocation()
  const [items, setItems] = useState([])
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setRefreshTick((tick) => tick + 1), REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // Re-read on navigation too, so finishing work on the dashboard clears the alert
  useEffect(() => {
    let ignore = false
    getMyWork()
      .then((data) => {
        if (!ignore) setItems(data)
      })
      .catch(() => {
        // Leave the last known state; the dashboard shows the error
      })
    return () => {
      ignore = true
    }
  }, [pathname, refreshTick])

  const urgent = urgentWork(items, now)
  if (urgent.length === 0) return null
  const overdue = urgent.filter((e) => e.state === 'overdue').length
  const dueSoon = urgent.length - overdue
  const label = [overdue > 0 && `${overdue} overdue`, dueSoon > 0 && `${dueSoon} due soon`].filter(Boolean).join(' · ')

  return (
    <Link
      to="/dashboard"
      className={`deadline-chip ${overdue > 0 ? 'deadline-chip-overdue' : 'deadline-chip-soon'}`}
      title="Work with a deadline coming up — open your dashboard"
    >
      <span aria-hidden="true">⏰</span> {label}
    </Link>
  )
}
