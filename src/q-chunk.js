/**
 * q-chunk - Queue & chunk your promises
 * @module q-chunk
 */

/**
 * Queue - one at a time
 * @template T
 * @param {Array<() => Promise<T>>} fns
 * @returns {Promise<T[]>}
 */
export const q = async fns => {
  const out = []
  for (const fn of fns) out.push(await fn())
  return out
}

/**
 * Chunk - n at a time
 * @template T
 * @param {Array<() => Promise<T>>} fns
 * @param {number} [n=5]
 * @returns {Promise<T[]>}
 */
export const chunk = async (fns, n = 5) =>
  fns.length ? [
    ...await Promise.all(fns.slice(0, n).map(f => f())),
    ...await chunk(fns.slice(n), n)
  ] : []

