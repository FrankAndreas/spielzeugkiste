import { describe, it, expect, vi, afterEach } from 'vitest'
import { createTraceLog, logEvent, sendTraces } from './traceLog.js'

describe('traceLog', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the meta data and events as one JSON line, then starts empty', async () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    const log = createTraceLog({ game: 'schreiben', letter: 'S' })
    logEvent(log, { kind: 'down', id: 1, x: 80, y: 20 })
    logEvent(log, { kind: 'up', id: 1 })
    sendTraces(log, { result: 'letter-done' })
    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, blob] = beacon.mock.calls[0]
    expect(url).toBe('/api/traces')
    const text = await blob.text()
    expect(text).not.toContain('\n')
    const body = JSON.parse(text)
    expect(body).toMatchObject({ game: 'schreiben', letter: 'S', result: 'letter-done' })
    expect(body.events.map(e => e.kind)).toEqual(['down', 'up'])
    expect(typeof body.events[0].t).toBe('number')
    expect(log.events).toEqual([])
  })

  it('sends nothing without events', () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    sendTraces(createTraceLog({}), {})
    expect(beacon).not.toHaveBeenCalled()
  })

  it('falls back to fetch and never throws', () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')))
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', fetchMock)
    const log = createTraceLog({})
    logEvent(log, { kind: 'down' })
    expect(() => sendTraces(log, {})).not.toThrow()
    expect(fetchMock).toHaveBeenCalledWith('/api/traces', expect.objectContaining({ method: 'POST', keepalive: true }))
  })
})
