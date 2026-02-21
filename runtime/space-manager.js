import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function generateSpaceMeta(taskDescription, type = 'feature') {
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .slice(0, 30);

  return {
    slug,
    branch: 'alataflow/' + type + '/' + slug,
    type,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    status: 'active',
  };
}

export function readSpaces(projectRoot) {
  const file = join(projectRoot, '.alataflow', 'spaces.json');
  if (!existsSync(file)) return [];
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
}

export function writeSpaces(projectRoot, spaces) {
  writeFileSync(
    join(projectRoot, '.alataflow', 'spaces.json'),
    JSON.stringify(spaces, null, 2),
    'utf8'
  );
}

export function setCurrentSpace(projectRoot, slug) {
  writeFileSync(join(projectRoot, '.alataflow', 'current_space'), slug, 'utf8');
}

export function getCurrentSpace(projectRoot) {
  const file = join(projectRoot, '.alataflow', 'current_space');
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8').trim() || null;
}
