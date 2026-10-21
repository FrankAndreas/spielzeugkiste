// Handwriting traces (Schreiben): each POST body is appended as one JSON line.
// When the file grows past MAX_BYTES, only its newest half is kept, so it
// never needs cleaning up from outside. Runs in nginx (njs).
import fs from 'fs'

const FILE      = '/var/log/traces/traces.jsonl'
const MAX_BYTES = 1024 * 1024
const KEEP      = MAX_BYTES / 2

// Drops the oldest lines, keeping about KEEP characters of whole lines
function trim() {
  if (fs.statSync(FILE).size <= MAX_BYTES) return
  const text = fs.readFileSync(FILE, 'utf8')
  const tail = text.slice(-KEEP)
  fs.writeFileSync(FILE, tail.slice(tail.indexOf('\n') + 1))
}

function append(r) {
  if (r.method !== 'POST') return r.return(405)
  const body = r.requestText
  if (body) {
    try {
      fs.appendFileSync(FILE, body.replace(/\n/g, ' ') + '\n')
      trim()
    } catch (e) {
      // Debug data only: never fail the game because of it
      r.error(`traces: ${e}`)
    }
  }
  r.return(204)
}

export default { append }
