import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { applyMonthlyDecay } from './capsule-decay.js';

describe('applyMonthlyDecay', () => {
  it('decays capsule unused for 31 days', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.8, last_used_at: oldDate }];
    const result = applyMonthlyDecay(capsules);
    assert.ok(result[0].confidence < 0.8);
    assert.ok(Math.abs(result[0].confidence - 0.8 * 0.95) < 0.0001);
  });

  it('does not decay capsule used within 30 days', () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.8, last_used_at: recentDate }];
    const result = applyMonthlyDecay(capsules);
    assert.strictEqual(result[0].confidence, 0.8);
  });

  it('respects minimum confidence floor of 0.10', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.10, last_used_at: oldDate }];
    const result = applyMonthlyDecay(capsules);
    assert.strictEqual(result[0].confidence, 0.10);
  });

  it('skips non-capsule entries', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const entries = [{ kind: 'memory', confidence: 0.8, last_used_at: oldDate }];
    const result = applyMonthlyDecay(entries);
    assert.strictEqual(result[0].confidence, 0.8);
  });
});
