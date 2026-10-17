import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import { onTimed, type Timed } from '../src/timing';

// QA's metrics (D139): with QA_METRICS set to a folder, every request the API's tests make is
// recorded, one JSON line each, in <folder>/api.jsonl; scripts/qa-diff.mjs turns them into numbers per
// route. Without it, nothing is recorded.
const dir = process.env.QA_METRICS;
if (dir) {
  const seen: Timed[] = [];
  onTimed((t) => seen.push(t));
  afterAll(() => {
    mkdirSync(dir, { recursive: true });
    if (seen.length) appendFileSync(join(dir, 'api.jsonl'), seen.map((t) => JSON.stringify(t)).join('\n') + '\n');
  });
}
