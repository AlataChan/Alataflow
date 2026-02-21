import { describe, it, afterEach } from 'node:test';
import { strict as assert } from 'assert';
import { existsSync, rmSync, readFileSync } from 'fs';
import { initAlataflow } from './init.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-test-' + Date.now());

describe('initAlataflow', () => {
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('creates .alataflow directory with required files', () => {
    initAlataflow(testDir);
    assert.ok(existsSync(join(testDir, '.alataflow/memory.jsonl')));
    assert.ok(existsSync(join(testDir, '.alataflow/spaces.json')));
    assert.ok(existsSync(join(testDir, '.alataflow/session_state.json')));
    assert.strictEqual(readFileSync(join(testDir, '.alataflow/spaces.json'), 'utf8'), '[]');
    assert.strictEqual(readFileSync(join(testDir, '.alataflow/session_state.json'), 'utf8'), '{}');
  });

  it('is idempotent — safe to call twice', () => {
    initAlataflow(testDir);
    initAlataflow(testDir);
    assert.ok(existsSync(join(testDir, '.alataflow/memory.jsonl')));
  });
});
