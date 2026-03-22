import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initExperimentsTsv,
  appendExperimentRow,
  readExperimentsTsv,
  getLastKeepOrBaseline,
  decideExperiment,
  writeExperimentFlag,
  updateHeartbeat,
  removeExperimentFlag,
  isExperimentActive,
  buildExperimentMemoryEntry,
} from './experiment-tracker.js';

const testDir = join(tmpdir(), 'alataflow-exp-integration-' + Date.now());
const slug = 'integration-test';

describe('experiment-tracker integration: full 3-round lifecycle', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    mkdirSync(join(testDir, '.plans', slug), { recursive: true });
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  // Step 1: start experiment
  it('1. writeExperimentFlag activates experiment', () => {
    writeExperimentFlag(testDir, slug, 300);
    assert.ok(isExperimentActive(testDir, slug), 'experiment should be active after writing flag');
  });

  // Step 2: record baseline (round 0)
  it('2. record baseline row (round 0)', () => {
    initExperimentsTsv(testDir, slug);
    appendExperimentRow(testDir, slug, {
      round: 0,
      commit: 'aaa1111',
      description: 'baseline snapshot',
      pass_rate: '8/10',
      metric_value: '152.7',
      metric_direction: 'lower',
      loc_delta: 0,
      status: 'baseline',
      mode: 'repair',
    });

    const rows = readExperimentsTsv(testDir, slug);
    assert.strictEqual(rows.length, 1, 'should have exactly 1 row after baseline');
    assert.strictEqual(rows[0].round, 0);
    assert.strictEqual(rows[0].status, 'baseline');
    assert.strictEqual(rows[0].pass_rate, '8/10');
  });

  // Step 3: round 1 — pass_rate improves → keep
  it('3. round 1: improvement (8/10 → 10/10) → keep', () => {
    const decision = decideExperiment('8/10', '10/10');
    assert.strictEqual(decision, 'keep', 'improved pass_rate should be kept');

    appendExperimentRow(testDir, slug, {
      round: 1,
      commit: 'bbb2222',
      description: 'fix N+1 query',
      pass_rate: '10/10',
      metric_value: '98.3',
      metric_direction: 'lower',
      loc_delta: -12,
      status: decision,
      mode: 'repair',
    });

    const rows = readExperimentsTsv(testDir, slug);
    assert.strictEqual(rows.length, 2);
    const ref = getLastKeepOrBaseline(rows);
    assert.strictEqual(ref.round, 1, 'last keep/baseline should be round 1');
  });

  // Step 4: heartbeat refresh
  it('4. updateHeartbeat reflects round number', () => {
    updateHeartbeat(testDir, slug, 1);
    const flag = JSON.parse(readFileSync(join(testDir, '.alataflow', 'experiment_active.' + slug), 'utf8'));
    assert.strictEqual(flag.round, 1);
    assert.ok(flag.heartbeat_at, 'heartbeat_at should exist');
  });

  // Step 5: round 2 — pass_rate regresses → discard
  it('5. round 2: regression (10/10 → 7/10) → discard', () => {
    const decision = decideExperiment('10/10', '7/10');
    assert.strictEqual(decision, 'discard');

    appendExperimentRow(testDir, slug, {
      round: 2,
      commit: 'ccc3333',
      description: 'aggressive refactor broke tests',
      pass_rate: '7/10',
      metric_value: '200.1',
      metric_direction: 'lower',
      loc_delta: 45,
      status: decision,
      mode: 'repair',
    });

    const rows = readExperimentsTsv(testDir, slug);
    assert.strictEqual(rows.length, 3);
    const ref = getLastKeepOrBaseline(rows);
    assert.strictEqual(ref.round, 1, 'discard should not become the reference — still round 1');
  });

  // Step 6: round 3 — same pass_rate, fewer lines → keep
  it('6. round 3: simplification (loc -15, same pass_rate) → keep', () => {
    const decision = decideExperiment('10/10', '10/10', { locDelta: -15 });
    assert.strictEqual(decision, 'keep');

    appendExperimentRow(testDir, slug, {
      round: 3,
      commit: 'ddd4444',
      description: 'remove dead code',
      pass_rate: '10/10',
      metric_value: '95.0',
      metric_direction: 'lower',
      loc_delta: -15,
      status: decision,
      mode: 'repair',
    });

    const rows = readExperimentsTsv(testDir, slug);
    assert.strictEqual(rows.length, 4, 'should have 1 baseline + 3 rounds');
  });

  // Step 7: build memory entry — counts must match actual data
  it('7. buildExperimentMemoryEntry produces consistent counts', () => {
    const rows = readExperimentsTsv(testDir, slug);
    const entry = buildExperimentMemoryEntry(testDir, slug, rows);

    assert.strictEqual(entry.kind, 'experiment');
    assert.ok(entry.summary.includes(slug), 'summary should contain slug');
    assert.ok(entry.summary.includes('2/3 rounds kept'), 'should report 2 kept out of 3 rounds');
    assert.ok(entry.summary.includes('-27 lines'), 'total loc_delta: -12 + -15 = -27');
    assert.strictEqual(entry.tags.type, 'experiment');
    assert.strictEqual(entry.tags.space, slug);
    assert.ok(entry.content.includes('baseline pass_rate=8/10'));
    assert.ok(entry.content.includes('best pass_rate=10/10'));
    assert.ok(entry.content.includes('mode=repair'));
  });

  // Step 8: remove flag
  it('8. removeExperimentFlag deactivates experiment', () => {
    removeExperimentFlag(testDir, slug);
    assert.ok(!isExperimentActive(testDir, slug), 'experiment should no longer be active');
  });

  // Step 9: idempotent removal
  it('9. removeExperimentFlag is idempotent (no throw on second call)', () => {
    assert.doesNotThrow(() => removeExperimentFlag(testDir, slug));
  });

  // Step 10: final TSV integrity
  it('10. final TSV has 4 complete rows with correct types', () => {
    const rows = readExperimentsTsv(testDir, slug);
    assert.strictEqual(rows.length, 4);

    for (const row of rows) {
      assert.strictEqual(typeof row.round, 'number', 'round should be number');
      assert.strictEqual(typeof row.loc_delta, 'number', 'loc_delta should be number');
      assert.ok(row.commit && row.commit !== '', 'commit should not be empty');
      assert.ok(row.status, 'status should exist');
      assert.ok(row.timestamp, 'timestamp should exist');
    }

    assert.deepStrictEqual(
      rows.map(r => r.status),
      ['baseline', 'keep', 'discard', 'keep'],
      'status sequence should match experiment flow'
    );
    assert.deepStrictEqual(
      rows.map(r => r.round),
      [0, 1, 2, 3],
      'round numbers should be sequential'
    );
  });
});
