import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function initAlataflow(projectRoot) {
  const dir = join(projectRoot, '.alataflow');
  mkdirSync(dir, { recursive: true });
  const files = {
    'memory.jsonl': '',
    'spaces.json': '[]',
    'session_state.json': '{}',
  };
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    if (!existsSync(path)) {
      writeFileSync(path, content, 'utf8');
    }
  }
}
