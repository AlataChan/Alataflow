import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, readFileSync, rmSync } from 'fs';
import { writeMemory } from './memory-writer.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-writer-' + Date.now());

describe('writeMemory', () => {
  before(() => mkdirSync(join(testDir, '.alataflow'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('appends a valid JSON line to memory.jsonl', () => {
    const id = writeMemory(testDir, {
      kind: 'memory',
      summary: 'FastAPI needs CORS for OAuth callbacks',
      tags: { project: testDir, type: 'pattern', area: 'auth' },
    });
    assert.ok(id.startsWith('sha256:'));
    const lines = readFileSync(join(testDir, '.alataflow', 'memory.jsonl'), 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.summary, 'FastAPI needs CORS for OAuth callbacks');
    assert.ok(entry.created_at);
    assert.ok(entry.updated_at);
  });

  it('scrubs API keys from content before writing', () => {
    writeMemory(testDir, {
      kind: 'memory',
      summary: 'Config note',
      content: 'key = sk-abc123def456ghi789jkl012mno345',
      tags: { project: testDir },
    });
    const lines = readFileSync(join(testDir, '.alataflow', 'memory.jsonl'), 'utf8').split('\n').filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]);
    assert.ok(!last.content.includes('sk-'));
  });
});
