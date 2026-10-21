// The child's paintings (Malen), kept on this device in IndexedDB: the full
// image and a small thumbnail as data URLs. Only the newest MAX_PAINTINGS stay.
export const MAX_PAINTINGS = 20

const DB    = 'spielzeugkiste'
const STORE = 'paintings'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// Runs fn(store) in a transaction and resolves with its result when it commits
async function inStore(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    let result
    Promise.resolve(fn(tx.objectStore(STORE))).then(r => { result = r })
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror    = () => { db.close(); reject(tx.error) }
  })
}

const request = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result)
  req.onerror   = () => reject(req.error)
})

const newest = (a, b) => b.updated - a.updated

/** All paintings, newest first, without their full images. */
export async function listPaintings() {
  const all = await inStore('readonly', store => request(store.getAll()))
  return all.sort(newest).map(({ image: _image, ...rest }) => rest)
}

export function loadPainting(id) {
  return inStore('readonly', store => request(store.get(id)))
}

/** Saves a new painting (no id) or updates one; returns its id. The oldest beyond MAX_PAINTINGS go. */
export function savePainting({ id, image, thumb }) {
  return inStore('readwrite', async store => {
    const all = await request(store.getAll())
    // Strictly newer than everything else, even when saved in the same millisecond
    const updated = Math.max(Date.now(), ...all.map(p => p.updated + 1))
    const key = id ?? `p-${updated.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    store.put({ id: key, image, thumb, updated })
    const others = all.filter(p => p.id !== key).sort(newest)
    for (const old of others.slice(MAX_PAINTINGS - 1)) store.delete(old.id)
    return key
  })
}

export function deletePainting(id) {
  return inStore('readwrite', store => request(store.delete(id)))
}
