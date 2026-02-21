import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { generateSpaceMeta } from './space-manager.js';

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
});
