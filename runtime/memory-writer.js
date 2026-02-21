import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

function scrubText(text) {
  if (!text) return text;
  text = String(text);
  return text
    .replace(/(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED]')
    .replace(/(Bearer [a-zA-Z0-9+/=]{20,})/g, 'Bearer [REDACTED]')
    .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, '[REDACTED_KEY]')
    .replace(/(password\s*[:=]\s*)\S{8,}/gi, '[REDACTED]');
}

export function writeMemory(projectRoot, entry) {
  const now = new Date().toISOString();
  const content = scrubText(entry.content ?? '');
  const summary = scrubText(entry.summary ?? '');

  const record = {
    ...entry,
    summary,
    content,
    asset_id: 'sha256:' + createHash('sha256').update(summary + now).digest('hex').slice(0, 16),
    confidence: entry.confidence ?? 0.5,
    success_streak: entry.success_streak ?? 0,
    validation: entry.validation ?? 'unverified',
    use_count: 0,
    last_used_at: now,
    created_at: now,
    updated_at: now,
    synced_at: null,
  };

  const filePath = join(projectRoot, '.alataflow', 'memory.jsonl');
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');

  return record.asset_id;
}
