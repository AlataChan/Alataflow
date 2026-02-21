import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export function extractCapsule(projectRoot, { summary, gene_id, patch_diff, validation_notes, tags }) {
  const now = new Date().toISOString();
  const id = 'cap-' + createHash('sha256').update(summary + now).digest('hex').slice(0, 12);
  const capsuleDir = join(projectRoot, '.alataflow', 'evolution', 'capsules', id);
  mkdirSync(capsuleDir, { recursive: true });

  const capsule = {
    capsule_id: id,
    gene_id: gene_id ?? null,
    summary,
    tags,
    confidence: 0.5,
    success_streak: 0,
    use_count: 0,
    validation: 'verified',
    created_at: now,
    updated_at: now,
    last_used_at: now,
    patch_path: join(capsuleDir, 'patch.diff'),
  };

  writeFileSync(join(capsuleDir, 'capsule.json'), JSON.stringify(capsule, null, 2), 'utf8');
  writeFileSync(join(capsuleDir, 'patch.diff'), patch_diff ?? '', 'utf8');
  writeFileSync(join(capsuleDir, 'validation.md'), '# Validation Report\n\n' + (validation_notes ?? '') + '\n', 'utf8');

  return id;
}

export function updateCapsuleStats(stats, success) {
  const CONFIDENCE_CEILING = 0.95;
  const CONFIDENCE_FLOOR = 0.10;

  if (success) {
    return {
      ...stats,
      confidence: Math.min(CONFIDENCE_CEILING, Math.round((stats.confidence + 0.05) * 10000) / 10000),
      success_streak: stats.success_streak + 1,
      use_count: stats.use_count + 1,
      last_used_at: new Date().toISOString(),
    };
  } else {
    return {
      ...stats,
      confidence: Math.max(CONFIDENCE_FLOOR, Math.round((stats.confidence - 0.10) * 10000) / 10000),
      success_streak: 0,
      use_count: stats.use_count + 1,
      last_used_at: new Date().toISOString(),
    };
  }
}
