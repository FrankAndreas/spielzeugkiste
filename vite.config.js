import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { appendFileSync, mkdirSync } from 'node:fs'

// Dev-server twin of the nginx /api/traces endpoint: appends each POST body
// as one line to traces/traces.jsonl
const traces = {
  name: 'traces',
  configureServer(server) {
    server.middlewares.use('/api/traces', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        mkdirSync('traces', { recursive: true })
        if (body) appendFileSync('traces/traces.jsonl', body.replace(/\n/g, ' ') + '\n')
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
