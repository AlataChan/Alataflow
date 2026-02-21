import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import { scanForSensitiveContent } from './scrubber-rules.js';

describe('scanForSensitiveContent', () => {
  it('detects OpenAI API key pattern', () => {
    const result = scanForSensitiveContent('use key sk-abc123def456ghi789jkl012mno345');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'api-key');
  });

  it('detects PEM private key', () => {
    const result = scanForSensitiveContent('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'private-key');
  });

  it('detects inline password assignment', () => {
    const result = scanForSensitiveContent('password = supersecretpass123');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'password-field');
  });

  it('passes clean text', () => {
    const result = scanForSensitiveContent('add user authentication with OAuth2');
    assert.ok(!result.hit);
  });

  it('respects [SAFE] prefix bypass', () => {
    const result = scanForSensitiveContent('[SAFE] sk-abc123def456ghi789jkl012mno345');
    assert.ok(!result.hit);
  });
});
