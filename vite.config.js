import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'

// Dev-server twin of the nginx /api/traces endpoint (nginx/traces.js): appends
// each POST body as one line to traces/traces.jsonl, kept to about 1 MB
const TRACES     = 'traces/traces.jsonl'
const MAX_TRACES = 1024 * 1024

function trimTraces() {
  if (statSync(TRACES).size <= MAX_TRACES) return
  const tail = readFileSync(TRACES, 'utf8').slice(-MAX_TRACES / 2)
  writeFileSync(TRACES, tail.slice(tail.indexOf('\n') + 1))
}

const traces = {
  name: 'traces',
  configureServer(server) {
    server.middlewares.use('/api/traces', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        mkdirSync('traces', { recursive: true })
        if (body) {
          appendFileSync(TRACES, body.replace(/\n/g, ' ') + '\n')
          trimTraces()
        }
        res.statusCode = 204
        res.end()
      })
    })
  },
}

export default defineConfig({
  plugins: [vue(), traces],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
