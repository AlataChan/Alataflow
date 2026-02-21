import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, readFileSync, rmSync } from 'fs';
import { appendProgress } from './progress-writer.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-progress-' + Date.now());

describe('appendProgress', () => {
  before(() => mkdirSync(join(testDir, '.plans', 'auth-feature'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('appends a timestamped line to progress.md', () => {
    appendProgress(testDir, 'auth-feature', 'Write', 'src/auth/models.py');
    const content = readFileSync(join(testDir, '.plans', 'auth-feature', 'progress.md'), 'utf8');
    assert.ok(content.includes('[Write]'));
    assert.ok(content.includes('src/auth/models.py'));
  });

  it('appends (does not overwrite) on second call', () => {
    appendProgress(testDir, 'auth-feature', 'Edit', 'src/auth/routes.py');
    const content = readFileSync(join(testDir, '.plans', 'auth-feature', 'progress.md'), 'utf8');
    const lines = content.split('\n').filter(Boolean);
    assert.ok(lines.length >= 2);
  });
});
