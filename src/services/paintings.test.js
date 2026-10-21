import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { listPaintings, loadPainting, savePainting, deletePainting, MAX_PAINTINGS } from './paintings.js'

describe('paintings', () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

  it('starts empty', async () => {
    expect(await listPaintings()).toEqual([])
  })

  it('saves a new painting and loads it again', async () => {
    const id = await savePainting({ image: 'data:image/png;base64,AAA', thumb: 'data:image/jpeg;base64,BBB' })
    expect(id).toBeTruthy()
    const p = await loadPainting(id)
    expect(p).toMatchObject({ id, image: 'data:image/png;base64,AAA', thumb: 'data:image/jpeg;base64,BBB' })
    expect(typeof p.updated).toBe('number')
  })

  it('lists the newest first, without the full images', async () => {
    const a = await savePainting({ image: 'A', thumb: 'a' })
    const b = await savePainting({ image: 'B', thumb: 'b' })
    const list = await listPaintings()
    expect(list.map(p => p.id)).toEqual([b, a])
    expect(list[0]).not.toHaveProperty('image')
    expect(list[0].thumb).toBe('b')
  })

  it('saving an existing painting again moves it to the front', async () => {
    const a = await savePainting({ image: 'A', thumb: 'a' })
    const b = await savePainting({ image: 'B', thumb: 'b' })
    await savePainting({ id: a, image: 'A2', thumb: 'a2' })
    expect((await listPaintings()).map(p => p.id)).toEqual([a, b])
    expect((await loadPainting(a)).image).toBe('A2')
  })

  it(`keeps only the newest ${MAX_PAINTINGS}`, async () => {
    const ids = []
    for (let i = 0; i < MAX_PAINTINGS + 3; i++) ids.push(await savePainting({ image: `I${i}`, thumb: `t${i}` }))
    const list = await listPaintings()
    expect(list).toHaveLength(MAX_PAINTINGS)
    expect(list.map(p => p.id)).toEqual(ids.slice(3).reverse())
  })

  it('deletes a painting', async () => {
    const a = await savePainting({ image: 'A', thumb: 'a' })
    await deletePainting(a)
    expect(await listPaintings()).toEqual([])
    expect(await loadPainting(a)).toBeUndefined()
  })
})
