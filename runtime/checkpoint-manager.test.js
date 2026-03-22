import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint, detectCheckpoint } from './checkpoint-manager.js';

const testDir = join(tmpdir(), 'alataflow-cp-test-' + Date.now());

describe('checkpoint-manager', () => {
  before(() => {
    mkdirSync(join(testDir, '.plans', 'cp-test'), { recursive: true });
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('saves and loads checkpoint', () => {
    saveCheckpoint(testDir, 'cp-test', {
      step_index: 3,
      total_steps: 8,
      pending_items: ['implement API', 'write tests'],
      context_summary: 'Working on auth feature',
    });
    const cp = loadCheckpoint(testDir, 'cp-test');
    assert.strictEqual(cp.step_index, 3);
    assert.strictEqual(cp.total_steps, 8);
    assert.strictEqual(cp.pending_items.length, 2);
    assert.ok(cp.saved_at);
  });

  it('returns null for missing checkpoint', () => {
    const cp = loadCheckpoint(testDir, 'nonexistent');
    assert.strictEqual(cp, null);
  });

  it('clears checkpoint', () => {
    saveCheckpoint(testDir, 'cp-test', { step_index: 1 });
    clearCheckpoint(testDir, 'cp-test');
    assert.strictEqual(loadCheckpoint(testDir, 'cp-test'), null);
  });

  it('detectCheckpoint returns null for expired', () => {
    saveCheckpoint(testDir, 'cp-test', { step_index: 1 });
    const cp = loadCheckpoint(testDir, 'cp-test');
    cp.saved_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    writeFileSync(join(testDir, '.plans', 'cp-test', 'checkpoint.json'), JSON.stringify(cp), 'utf8');
    assert.strictEqual(detectCheckpoint(testDir, 'cp-test'), null);
  });

  it('detectCheckpoint returns valid recent checkpoint', () => {
    saveCheckpoint(testDir, 'cp-test', { step_index: 5, total_steps: 10 });
    const detected = detectCheckpoint(testDir, 'cp-test');
    assert.strictEqual(detected.step_index, 5);
  });
});
