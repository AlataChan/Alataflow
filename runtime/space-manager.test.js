import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateSpaceMeta, resolveStateRoot, backfillSpacePaths, readSpaces, writeSpaces } from './space-manager.js';

const testDir = join(tmpdir(), 'alataflow-sm-test-' + Date.now());

describe('space-manager', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    writeFileSync(join(testDir, '.alataflow', 'spaces.json'), '[]', 'utf8');
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  describe('generateSpaceMeta', () => {
    it('generates slug from task description', () => {
      const meta = generateSpaceMeta('Add user authentication with OAuth2');
      assert.ok(meta.slug.startsWith('add') || meta.slug.includes('user') || meta.slug.includes('auth'));
      assert.ok(meta.branch.startsWith('alataflow/'));
    });

    it('generates feature branch for feature type', () => {
      const meta = generateSpaceMeta('Add login page', 'feature');
      assert.strictEqual(meta.branch, 'alataflow/feature/' + meta.slug);
    });

    it('generates bugfix branch for bugfix type', () => {
      const meta = generateSpaceMeta('Fix login redirect', 'bugfix');
      assert.ok(meta.branch.startsWith('alataflow/bugfix/'));
    });

    it('slug is lowercase kebab-case, max 30 chars', () => {
      const meta = generateSpaceMeta('This is a very long task description that exceeds limits', 'feature');
      assert.ok(meta.slug.length <= 30);
      assert.ok(/^[a-z0-9-]+$/.test(meta.slug));
    });

    it('includes path fields when provided', () => {
      const meta = generateSpaceMeta('Test paths', 'feature', {
        mainCheckoutPath: '/main',
        worktreePath: '/wt',
      });
      assert.strictEqual(meta.main_checkout_path, '/main');
      assert.strictEqual(meta.worktree_path, '/wt');
      assert.strictEqual(meta.state_root_path, '/main');
    });

    it('has null paths when not provided', () => {
      const meta = generateSpaceMeta('No paths');
      assert.strictEqual(meta.main_checkout_path, null);
      assert.strictEqual(meta.worktree_path, null);
    });
  });

  describe('resolveStateRoot', () => {
    it('returns cwd when no .alataflow-root', () => {
      assert.strictEqual(resolveStateRoot(testDir), testDir);
    });

    it('follows .alataflow-root pointer', () => {
      const wtDir = join(testDir, 'worktree');
      mkdirSync(wtDir, { recursive: true });
      writeFileSync(join(wtDir, '.alataflow-root'), testDir, 'utf8');
      assert.strictEqual(resolveStateRoot(wtDir), testDir);
    });

    it('falls back to cwd if .alataflow-root points to invalid path', () => {
      const wtDir = join(testDir, 'worktree2');
      mkdirSync(wtDir, { recursive: true });
      writeFileSync(join(wtDir, '.alataflow-root'), '/nonexistent/path', 'utf8');
      assert.strictEqual(resolveStateRoot(wtDir), wtDir);
    });
  });

  describe('backfillSpacePaths', () => {
    it('backfills missing paths', () => {
      const spaces = [
        { slug: 'test', branch: 'alataflow/feature/test', status: 'active' },
      ];
      const changed = backfillSpacePaths(testDir, spaces);
      assert.ok(changed);
      assert.strictEqual(spaces[0].main_checkout_path, testDir);
      assert.strictEqual(spaces[0].state_root_path, testDir);
    });

    it('returns false when no changes needed', () => {
      const spaces = [
        { slug: 'test', main_checkout_path: '/a', state_root_path: '/a' },
      ];
      const changed = backfillSpacePaths(testDir, spaces);
      assert.ok(!changed);
    });
  });
});
