import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DECAY_FACTOR = 0.95;
const CONFIDENCE_FLOOR = 0.10;
const DECAY_THRESHOLD_DAYS = 30;

export function applyMonthlyDecay(entries) {
  const now = Date.now();
  return entries.map(entry => {
    if (entry.kind !== 'capsule') return entry;
    const lastUsed = new Date(entry.last_used_at).getTime();
    const daysSince = (now - lastUsed) / (1000 * 60 * 60 * 24);
    if (daysSince <= DECAY_THRESHOLD_DAYS) return entry;
    const confidence = typeof entry.confidence === 'number' && !isNaN(entry.confidence)
      ? entry.confidence : 0.5;
    const decayed = Math.max(CONFIDENCE_FLOOR, confidence * DECAY_FACTOR);
    return { ...entry, confidence: Math.round(decayed * 10000) / 10000 };
  });
}

export function decayCapsulesInMemoryFile(projectRoot) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return false;

  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const decayed = applyMonthlyDecay(entries);
  const changed = decayed.some((e, i) => e.confidence !== entries[i]?.confidence);
  if (changed) {
    writeFileSync(memFile, decayed.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  }

  return changed;
}
