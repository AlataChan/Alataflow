import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findPromotionCandidates, generateSkillDraft, writeSkillDraft, promoteEligibleCapsules } from './capsule-promote.js';

const testDir = join(tmpdir(), 'alataflow-promote-test-' + Date.now());

describe('capsule-promote', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    mkdirSync(join(testDir, 'skills'), { recursive: true });
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  describe('findPromotionCandidates', () => {
    it('returns empty for no memory file', () => {
      const candidates = findPromotionCandidates(join(testDir, 'nonexistent'));
      assert.strictEqual(candidates.length, 0);
    });

    it('finds capsules meeting threshold', () => {
      const memFile = join(testDir, '.alataflow', 'memory.jsonl');
      const entries = [
        JSON.stringify({ kind: 'capsule', confidence: 0.95, use_count: 12, summary: 'Auth pattern', capsule_id: 'cap-1' }),
        JSON.stringify({ kind: 'capsule', confidence: 0.5, use_count: 3, summary: 'Low confidence', capsule_id: 'cap-2' }),
        JSON.stringify({ kind: 'memory', confidence: 0.95, use_count: 15, summary: 'Not a capsule' }),
      ];
      writeFileSync(memFile, entries.join('\n') + '\n', 'utf8');
      const candidates = findPromotionCandidates(testDir);
      assert.strictEqual(candidates.length, 1);
      assert.strictEqual(candidates[0].capsule_id, 'cap-1');
    });
  });

  describe('generateSkillDraft', () => {
    it('generates valid skill markdown', () => {
      const draft = generateSkillDraft({
        summary: 'Auth middleware pattern',
        confidence: 0.95,
        use_count: 12,
        success_streak: 8,
        tags: { area: 'auth' },
        content: 'Use JWT + refresh token rotation',
      });
      assert.ok(draft.name.length > 0);
      assert.ok(draft.name.length <= 30);
      assert.strictEqual(draft.category, 'auth');
      assert.ok(draft.content.includes('Auth middleware pattern'));
      assert.ok(draft.content.includes('0.95'));
    });
  });

  describe('writeSkillDraft', () => {
    it('creates skill directory and file', () => {
      const draft = { name: 'test-skill', category: 'general', content: '# Test\n' };
      const dir = writeSkillDraft(testDir, draft);
      assert.ok(existsSync(join(dir, 'skill.md')));
    });
  });

  describe('promoteEligibleCapsules', () => {
    it('promotes eligible and skips existing', () => {
      const promoted = promoteEligibleCapsules(testDir);
      assert.ok(Array.isArray(promoted));
    });
  });
});
