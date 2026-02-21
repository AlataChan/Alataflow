import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function searchMemory(projectRoot, { query = '', tags = {}, limit = 20 } = {}) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return [];

  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const lowerQuery = query.toLowerCase();

  return entries
    .filter(e => {
      if (query && !(String(e.summary ?? '') + ' ' + String(e.content ?? '')).toLowerCase().includes(lowerQuery)) return false;
      for (const [k, v] of Object.entries(tags)) {
        if (e.tags?.[k] !== v) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, limit);
}
