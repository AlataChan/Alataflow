import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function loadMemoriesForProject(projectRoot, cwd, limit = 10) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return [];

  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const memories = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  return memories
    .filter(m => m.tags?.project === cwd)
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, limit);
}
