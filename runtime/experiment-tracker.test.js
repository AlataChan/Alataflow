import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initExperimentsTsv,
  appendExperimentRow,
  readExperimentsTsv,
  getLastKeepOrBaseline,
  decideExperiment,
  parsePassRate,
  writeExperimentFlag,
  updateHeartbeat,
  removeExperimentFlag,
  isExperimentActive,
  cleanStaleExperimentFlags,
  buildExperimentMemoryEntry,
} from './experiment-tracker.js';

const testDir = join(tmpdir(), 'alataflow-exp-test-' + Date.now());

describe('experiment-tracker', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    mkdirSync(join(testDir, '.plans', 'test-task'), { recursive: true });
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  describe('initExperimentsTsv', () => {
    it('creates TSV with header', () => {
      const path = initExperimentsTsv(testDir, 'test-task');
      assert.ok(existsSync(path));
      const content = readFileSync(path, 'utf8');
      assert.ok(content.startsWith('round\tcommit'));
    });

    it('is idempotent', () => {
      initExperimentsTsv(testDir, 'test-task');
      const content = readFileSync(join(testDir, '.plans', 'test-task', 'experiments.tsv'), 'utf8');
      const headerCount = content.split('\n').filter(l => l.startsWith('round\t')).length;
      assert.strictEqual(headerCount, 1);
    });
  });

  describe('appendExperimentRow + readExperimentsTsv', () => {
    it('writes and reads rows correctly', () => {
      appendExperimentRow(testDir, 'test-task', {
        round: 0, commit: 'abc1234', description: 'baseline',
        pass_rate: '8/10', metric_value: '152.7', metric_direction: 'lower',
        loc_delta: 0, status: 'baseline', mode: 'repair',
      });
      appendExperimentRow(testDir, 'test-task', {
        round: 1, commit: 'def5678', description: 'fix N+1 query',
        pass_rate: '10/10', metric_value: '-', metric_direction: 'lower',
        loc_delta: -12, status: 'keep', mode: 'repair',
      });

      const rows = readExperimentsTsv(testDir, 'test-task');
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0].round, 0);
      assert.strictEqual(rows[0].status, 'baseline');
      assert.strictEqual(rows[1].round, 1);
      assert.strictEqual(rows[1].status, 'keep');
      assert.strictEqual(rows[1].loc_delta, -12);
    });
  });

  describe('getLastKeepOrBaseline', () => {
    it('returns last keep row', () => {
      const rows = [
        { round: 0, status: 'baseline' },
        { round: 1, status: 'keep' },
        { round: 2, status: 'discard' },
      ];
      const result = getLastKeepOrBaseline(rows);
      assert.strictEqual(result.round, 1);
    });

    it('returns baseline if no keep', () => {
      const rows = [
        { round: 0, status: 'baseline' },
        { round: 1, status: 'discard' },
      ];
      const result = getLastKeepOrBaseline(rows);
      assert.strictEqual(result.round, 0);
    });
  });

  describe('parsePassRate', () => {
    it('parses valid rate', () => {
      assert.deepStrictEqual(parsePassRate('8/10'), { passed: 8, total: 10 });
    });
    it('returns null for dash', () => {
      assert.strictEqual(parsePassRate('-'), null);
    });
    it('returns null for invalid', () => {
      assert.strictEqual(parsePassRate('abc'), null);
    });
  });

  describe('decideExperiment', () => {
    it('discard when pass_rate drops', () => {
      assert.strictEqual(decideExperiment('10/10', '8/10'), 'discard');
    });

    it('keep when pass_rate improves', () => {
      assert.strictEqual(decideExperiment('8/10', '10/10'), 'keep');
    });

    it('keep when metric improves (lower is better)', () => {
      assert.strictEqual(
        decideExperiment('10/10', '10/10', {
          metricValue: 100, baselineMetricValue: 150, metricDirection: 'lower', locDelta: 0,
        }),
        'keep'
      );
    });

    it('discard when metric worsens', () => {
      assert.strictEqual(
        decideExperiment('10/10', '10/10', {
          metricValue: 200, baselineMetricValue: 150, metricDirection: 'lower', locDelta: 0,
        }),
        'discard'
      );
    });

    it('keep on simplicity (loc decrease, no metric)', () => {
      assert.strictEqual(decideExperiment('10/10', '10/10', { locDelta: -10 }), 'keep');
    });

    it('discard on loc increase with no metric', () => {
      assert.strictEqual(decideExperiment('10/10', '10/10', { locDelta: 20 }), 'discard');
    });

    it('marginal on small metric change + large loc increase', () => {
      assert.strictEqual(
        decideExperiment('10/10', '10/10', {
          metricValue: 148, baselineMetricValue: 150, metricDirection: 'lower',
          locDelta: 400, totalLines: 1000,
        }),
        'marginal'
      );
    });

    it('error on invalid pass_rate', () => {
      assert.strictEqual(decideExperiment('bad', '10/10'), 'error');
    });
  });

  describe('experiment flags', () => {
    it('write and check flag', () => {
      writeExperimentFlag(testDir, 'flag-test');
      assert.ok(isExperimentActive(testDir, 'flag-test'));
    });

    it('update heartbeat', () => {
      updateHeartbeat(testDir, 'flag-test', 3);
      const flag = JSON.parse(readFileSync(join(testDir, '.alataflow', 'experiment_active.flag-test'), 'utf8'));
      assert.strictEqual(flag.round, 3);
    });

    it('remove flag', () => {
      removeExperimentFlag(testDir, 'flag-test');
      assert.ok(!isExperimentActive(testDir, 'flag-test'));
    });
  });

  describe('cleanStaleExperimentFlags', () => {
    it('cleans stale flags with dead pid', () => {
      const flagPath = join(testDir, '.alataflow', 'experiment_active.stale-test');
      writeFileSync(flagPath, JSON.stringify({
        slug: 'stale-test',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        heartbeat_at: new Date(Date.now() - 3600000).toISOString(),
        pid: 999999999,
        timeout_sec: 300,
      }), 'utf8');
      const cleaned = cleanStaleExperimentFlags(testDir);
      assert.ok(cleaned.includes('stale-test'));
    });
  });

  describe('buildExperimentMemoryEntry', () => {
    it('builds valid memory entry', () => {
      const rows = [
        { round: 0, status: 'baseline', pass_rate: '8/10', mode: 'repair' },
        { round: 1, status: 'keep', pass_rate: '10/10', description: 'fix query', loc_delta: -12 },
        { round: 2, status: 'discard', pass_rate: '10/10', description: 'add cache', loc_delta: 38 },
      ];
      const entry = buildExperimentMemoryEntry(testDir, 'test-slug', rows);
      assert.strictEqual(entry.kind, 'experiment');
      assert.ok(entry.summary.includes('[EXPERIMENT]'));
      assert.ok(entry.summary.includes('test-slug'));
      assert.ok(entry.tags.type === 'experiment');
    });
  });
});
