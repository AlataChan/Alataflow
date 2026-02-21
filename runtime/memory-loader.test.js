import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { loadMemoriesForProject } from './memory-loader.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-mem-test-' + Date.now());
const memoryFile = join(testDir, '.alataflow', 'memory.jsonl');

const memories = [
  { asset_id: '1', kind: 'memory', summary: 'Use FastAPI', tags: { project: '/my/project' }, last_used_at: '2026-02-20T00:00:00Z' },
  { asset_id: '2', kind: 'memory', summary: 'Other project note', tags: { project: '/other/project' }, last_used_at: '2026-02-19T00:00:00Z' },
  { asset_id: '3', kind: 'memory', summary: 'FastAPI v2 patterns', tags: { project: '/my/project' }, last_used_at: '2026-02-18T00:00:00Z' },
];

describe('loadMemoriesForProject', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    writeFileSync(memoryFile, memories.map(m => JSON.stringify(m)).join('\n'), 'utf8');
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('returns only memories matching project cwd', () => {
    const result = loadMemoriesForProject(testDir, '/my/project');
    assert.strictEqual(result.length, 2);
    assert.ok(result.every(m => m.tags.project === '/my/project'));
  });

  it('returns memories sorted by last_used_at descending', () => {
    const result = loadMemoriesForProject(testDir, '/my/project');
    assert.strictEqual(result[0].asset_id, '1');
    assert.strictEqual(result[1].asset_id, '3');
  });

  it('returns empty array when memory file missing', () => {
    const result = loadMemoriesForProject('/nonexistent', '/my/project');
    assert.deepStrictEqual(result, []);
  });
});
