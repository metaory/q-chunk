# q-chunk

Queue & chunk your promises. No deps. 15 lines.

## Install

```bash
npm install q-chunk
```

## Usage

```javascript
import { q, chunk } from 'q-chunk'

const tasks = urls.map(url => () => fetch(url))

await q(tasks)        // sequential: 1 → 2 → 3
await chunk(tasks, 3) // batched: [1,2,3] → [4,5,6]
```

## API

### `q(fns)`

Queue execution - one at a time.

```javascript
await q([
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3')
])
```

### `chunk(fns, n = 5)`

Chunk execution - n at a time.

```javascript
await chunk([
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3'),
  () => fetch('/api/4')
], 2)  // [1,2] → [3,4]
```

## Demo

```bash
pnpm dev
```

## License

MIT
