import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { extractCapsule, updateCapsuleStats } from './evolution-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-evo-' + Date.now());

describe('extractCapsule', () => {
  before(() => mkdirSync(join(testDir, '.alataflow', 'evolution', 'capsules'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('creates capsule directory with capsule.json, patch.diff, validation.md', () => {
    const id = extractCapsule(testDir, {
      summary: 'FastAPI OAuth2 setup pattern',
      gene_id: 'gene-001',
      patch_diff: 'diff --git a/src/auth.py b/src/auth.py\n+from fastapi.security import OAuth2PasswordBearer',
      validation_notes: 'pytest tests/test_auth.py — 12 passed',
      tags: { project: testDir, type: 'pattern', area: 'auth' },
    });
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'capsule.json')));
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'patch.diff')));
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'validation.md')));
  });
});

describe('updateCapsuleStats', () => {
  it('increments confidence on success', () => {
    const before = { confidence: 0.5, success_streak: 2, use_count: 5 };
    const after = updateCapsuleStats(before, true);
    assert.ok(after.confidence > before.confidence);
    assert.strictEqual(after.success_streak, 3);
    assert.strictEqual(after.use_count, 6);
  });

  it('decrements confidence on failure and resets streak', () => {
    const before = { confidence: 0.5, success_streak: 3, use_count: 5 };
    const after = updateCapsuleStats(before, false);
    assert.ok(after.confidence < before.confidence);
    assert.strictEqual(after.success_streak, 0);
  });

  it('respects confidence ceiling of 0.95', () => {
    const before = { confidence: 0.94, success_streak: 10, use_count: 20 };
    const after = updateCapsuleStats(before, true);
    assert.ok(after.confidence <= 0.95);
  });
});
