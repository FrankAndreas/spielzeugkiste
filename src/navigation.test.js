import { describe, it, expect } from 'vitest'
import { upPath } from './navigation.js'

describe('upPath', () => {
  it.each([
    ['/memory',                    '/'],
    ['/memory/einhorn/play',       '/memory'],
    ['/differences/meer/play',     '/differences'],
    ['/coloring/feuerwehr/play',   '/coloring'],
    ['/snake/prinzessin/play',     '/snake'],
    ['/pacman/einhorn/play',       '/pacman'],
    ['/zahlen/musik/play',         '/zahlen'],
    ['/cheese/play',               '/'],
    ['/schreiben/play',            '/'],
    ['/schreiben/name/SINA',       '/schreiben/play'],
    ['/schreiben/letter/A',        '/schreiben/play'],
    ['/schreiben/words',           '/schreiben/play'],
    ['/malen/play',                '/'],
    ['/malen/draw',                '/malen/play'],
    ['/malen/draw/p-123',          '/malen/play'],
    ['/',                          '/'],
  ])('goes up from %s to %s', (from, to) => {
    expect(upPath(from)).toBe(to)
  })
})
