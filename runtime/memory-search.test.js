import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { searchMemory } from './memory-search.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-search-' + Date.now());

const entries = [
  { asset_id: '1', summary: 'FastAPI needs CORS for OAuth', tags: { project: testDir, type: 'pattern' }, kind: 'memory', last_used_at: '2026-02-20T00:00:00Z' },
  { asset_id: '2', summary: 'Use pydantic v2 for validation', tags: { project: testDir, type: 'pattern' }, kind: 'memory', last_used_at: '2026-02-19T00:00:00Z' },
  { asset_id: '3', summary: 'PostgreSQL utf8 encoding issue', tags: { project: testDir, type: 'lesson' }, kind: 'memory', last_used_at: '2026-02-18T00:00:00Z' },
];

describe('searchMemory', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    writeFileSync(join(testDir, '.alataflow', 'memory.jsonl'), entries.map(e => JSON.stringify(e)).join('\n'), 'utf8');
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('finds entries by keyword in summary', () => {
    const results = searchMemory(testDir, { query: 'FastAPI' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].asset_id, '1');
  });

  it('filters by tag type', () => {
    const results = searchMemory(testDir, { tags: { type: 'lesson' } });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].asset_id, '3');
  });

  it('returns all when no query or filter', () => {
    const results = searchMemory(testDir, {});
    assert.strictEqual(results.length, 3);
  });

  it('is case-insensitive', () => {
    const results = searchMemory(testDir, { query: 'fastapi' });
    assert.strictEqual(results.length, 1);
  });
});
