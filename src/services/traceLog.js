// Pen traces for tuning the handwriting game, posted to /api/traces.
// nginx (and the Vite dev server) append each post as one JSON line.
const URL = '/api/traces'

export function createTraceLog(meta) {
  return { meta, start: performance.now(), events: [] }
}

/** Records an event with its time in ms since the log started. */
export function logEvent(log, event) {
  log.events.push({ t: Math.round(performance.now() - log.start), ...event })
}

/** Sends the meta data, extra fields and events recorded so far; never throws. */
export function sendTraces(log, extra) {
  if (!log.events.length) return
  const body = JSON.stringify({ ...log.meta, ...extra, sentAt: new Date().toISOString(), events: log.events })
  log.events = []
  try {
    const blob = new Blob([body], { type: 'text/plain' })
    if (navigator.sendBeacon?.(URL, blob)) return
    fetch(URL, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
  } catch {
    // Debug data only: losing it must never disturb the game
  }
}
