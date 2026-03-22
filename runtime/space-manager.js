import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

export function resolveStateRoot(cwd) {
  const rootFile = join(cwd, '.alataflow-root');
  if (existsSync(rootFile)) {
    const root = readFileSync(rootFile, 'utf8').trim();
    if (root && existsSync(join(root, '.alataflow'))) return root;
  }
  return cwd;
}

export function generateSpaceMeta(taskDescription, type = 'feature', { mainCheckoutPath, worktreePath } = {}) {
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
    state_root_path: mainCheckoutPath ?? null,
    main_checkout_path: mainCheckoutPath ?? null,
    worktree_path: worktreePath ?? null,
  };
}

export function backfillSpacePaths(projectRoot, spaces) {
  let changed = false;
  for (const space of spaces) {
    if (!space.main_checkout_path) {
      space.main_checkout_path = projectRoot;
      space.state_root_path = projectRoot;
      changed = true;
    }
    if (!space.state_root_path) {
      space.state_root_path = space.main_checkout_path ?? projectRoot;
      changed = true;
    }
  }
  return changed;
}

export function readSpaces(projectRoot) {
  const file = join(projectRoot, '.alataflow', 'spaces.json');
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

export function getStaleSpaces(projectRoot) {
  const spaces = readSpaces(projectRoot);
  const now = Date.now();
  return spaces.filter(s => {
    if (s?.status === 'completed') return false;
    const last = new Date(s?.last_active).getTime();
    return (now - last) > 24 * 60 * 60 * 1000;
  });
}
