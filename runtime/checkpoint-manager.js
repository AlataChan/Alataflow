import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

export function saveCheckpoint(stateRoot, slug, data) {
  const filePath = join(stateRoot, '.plans', slug, 'checkpoint.json');
  mkdirSync(dirname(filePath), { recursive: true });
  const checkpoint = {
    slug,
    step_index: data.step_index ?? 0,
    total_steps: data.total_steps ?? 0,
    pending_items: data.pending_items ?? [],
    context_summary: data.context_summary ?? '',
    saved_at: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf8');
  return checkpoint;
}

export function loadCheckpoint(stateRoot, slug) {
  const filePath = join(stateRoot, '.plans', slug, 'checkpoint.json');
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function clearCheckpoint(stateRoot, slug) {
  const filePath = join(stateRoot, '.plans', slug, 'checkpoint.json');
  try {
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch { /* ignore */ }
}

export function detectCheckpoint(stateRoot, slug) {
  if (!slug) return null;
  const cp = loadCheckpoint(stateRoot, slug);
  if (!cp) return null;
  const age = Date.now() - new Date(cp.saved_at).getTime();
  if (age > 7 * 24 * 60 * 60 * 1000) return null;
  return cp;
}
