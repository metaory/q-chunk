/**
 * chunked-promise - Chunked async execution
 * @module chunked-promise
 */

/**
 * @typedef {Object} TaskResult
 * @property {'fulfilled' | 'rejected'} status
 * @property {*} [value] - Present if status is 'fulfilled'
 * @property {*} [reason] - Present if status is 'rejected'
 */

/**
 * @typedef {Object} ProgressInfo
 * @property {number} done - Number of completed tasks
 * @property {number} total - Total number of tasks
 * @property {TaskResult[]} results - Results so far
 */

/**
 * @typedef {Object} Options
 * @property {(info: ProgressInfo) => void} [onProgress] - Progress callback
 * @property {AbortSignal} [signal] - AbortSignal for cancellation
 * @property {number} [timeout] - Per-task timeout in ms
 * @property {number} [rateLimit] - Max tasks per second (0 = unlimited)
 */

/** Custom error for aborted operations */
export class AbortError extends Error {
  constructor(message = 'Operation aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

/** Custom error for timeout */
export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Check if signal is aborted and throw if so
 * @param {AbortSignal} [signal]
 */
const checkAbort = signal => {
  if (signal?.aborted) throw new AbortError()
}

/**
 * Wrap a task with timeout
 * @param {() => Promise<*>} fn
 * @param {number} [timeout]
 * @returns {Promise<*>}
 */
const withTimeout = (fn, timeout) => {
  if (!timeout) return fn()
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError()), timeout)
    )
  ])
}

/**
 * Execute a task and return settled result
 * @param {() => Promise<*>} fn
 * @param {number} [timeout]
 * @returns {Promise<TaskResult>}
 */
const execTask = async (fn, timeout) => {
  try {
    const value = await withTimeout(fn, timeout)
    return { status: 'fulfilled', value }
  } catch (error) {
    return { status: 'rejected', reason: error }
  }
}

/**
 * Calculate delay needed for rate limiting
 * @param {number[]} timestamps - Recent task start timestamps
 * @param {number} rateLimit - Max tasks per second
 * @returns {number} - Delay in ms
 */
const getRateLimitDelay = (timestamps, rateLimit) => {
  if (!rateLimit || timestamps.length < rateLimit) return 0
  const windowStart = Date.now() - 1000
  const recentCount = timestamps.filter(t => t > windowStart).length
  if (recentCount < rateLimit) return 0
  const oldestInWindow = timestamps.find(t => t > windowStart) || timestamps[0]
  return Math.max(0, oldestInWindow + 1000 - Date.now() + 10)
}

/**
 * Queue - one at a time
 * @template T
 * @param {Array<() => Promise<T>>} fns
 * @param {Options} [opts={}]
 * @returns {Promise<TaskResult[]>}
 */
export const q = async (fns, opts = {}) => {
  const { onProgress, signal, timeout, rateLimit } = opts
  const results = []
  const timestamps = []
  const total = fns.length

  for (const fn of fns) {
    checkAbort(signal)

    // Rate limiting
    if (rateLimit) {
      const delay = getRateLimitDelay(timestamps, rateLimit)
      if (delay > 0) await new Promise(r => setTimeout(r, delay))
      timestamps.push(Date.now())
      // Keep only last second of timestamps
      while (timestamps.length > rateLimit) timestamps.shift()
    }

    checkAbort(signal)
    const result = await execTask(fn, timeout)
    results.push(result)

    if (onProgress) {
      onProgress({ done: results.length, total, results: [...results] })
    }
  }

  return results
}

/**
 * Chunk - n at a time
 * @template T
 * @param {Array<() => Promise<T>>} fns
 * @param {number} [n=5]
 * @param {Options} [opts={}]
 * @returns {Promise<TaskResult[]>}
 */
export const chunk = async (fns, n = 5, opts = {}) => {
  const { onProgress, signal, timeout, rateLimit } = opts
  const results = []
  const timestamps = []
  const total = fns.length
  let index = 0

  while (index < fns.length) {
    checkAbort(signal)

    const batch = fns.slice(index, index + n)
    const batchResults = await Promise.all(
      batch.map(async (fn, i) => {
        // Rate limiting within batch
        if (rateLimit) {
          const delay = getRateLimitDelay(timestamps, rateLimit)
          if (delay > 0) await new Promise(r => setTimeout(r, delay))
          timestamps.push(Date.now())
          // Keep only last second of timestamps
          while (timestamps.length > rateLimit * 2) timestamps.shift()
        }

        checkAbort(signal)
        const result = await execTask(fn, timeout)

        // Progress callback per task
        if (onProgress) {
          const done = results.length + batch.slice(0, i + 1).filter(() => true).length
          onProgress({ done: Math.min(done, total), total, results: [...results, result] })
        }

        return result
      })
    )

    results.push(...batchResults)
    index += n

    // Progress callback after batch (accurate count)
    if (onProgress) {
      onProgress({ done: results.length, total, results: [...results] })
    }
  }

  return results
}
