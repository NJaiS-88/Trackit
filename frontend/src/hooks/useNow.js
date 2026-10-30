import { useEffect, useState } from 'react'

/** The current time in ms, refreshed every `intervalMs` so time-based labels update without a reload. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
