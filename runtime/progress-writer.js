import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export function appendProgress(projectRoot, spaceSlug, toolName, description) {
  const filePath = join(projectRoot, '.plans', spaceSlug, 'progress.md');
  mkdirSync(dirname(filePath), { recursive: true });
  const truncated = String(description).slice(0, 120);
  const line = '[' + new Date().toISOString() + '] [' + toolName + '] ' + truncated + '\n';
  appendFileSync(filePath, line, 'utf8');
}
