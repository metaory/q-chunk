# chunked-promise

Chunked async execution. No deps.

## Install

```bash
npm install chunked-promise
```

## Usage

```javascript
import { q, chunk } from 'chunked-promise'

const tasks = urls.map(url => () => fetch(url))

await q(tasks)        // sequential: 1 → 2 → 3
await chunk(tasks, 3) // batched: [1,2,3] → [4,5,6]
```

## API

### `q(fns, opts?)`

Queue execution - one at a time.

```javascript
await q([
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3')
])
```

### `chunk(fns, n = 5, opts?)`

Chunk execution - n at a time.

```javascript
await chunk([
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3'),
  () => fetch('/api/4')
], 2)  // [1,2] → [3,4]
```

### Options

Both functions accept an options object:

```javascript
await chunk(tasks, 4, {
  onProgress: ({ done, total, results }) => {},  // Progress callback
  signal: AbortSignal,                            // Cancellation
  timeout: 5000,                                  // Per-task timeout (ms)
  rateLimit: 10,                                  // Max tasks per second
})
```

Results use settled mode (like `Promise.allSettled`):

```javascript
[
  { status: 'fulfilled', value: result },
  { status: 'rejected', reason: error },
]
```

## Demo

```bash
pnpm dev
```

## License

MIT
