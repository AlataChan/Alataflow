import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const PROMOTION_THRESHOLD = 0.9;
const MIN_USE_COUNT = 10;

export function findPromotionCandidates(projectRoot) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return [];
  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const candidates = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.kind !== 'capsule') continue;
      if ((entry.confidence ?? 0) >= PROMOTION_THRESHOLD && (entry.use_count ?? 0) >= MIN_USE_COUNT) {
        candidates.push(entry);
      }
    } catch { /* skip malformed */ }
  }
  return candidates;
}

export function generateSkillDraft(capsule) {
  const name = (capsule.summary ?? 'unnamed')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .slice(0, 30);

  const area = capsule.tags?.area ?? 'general';

  return {
    name,
    category: area,
    content: `# ${capsule.summary ?? 'Promoted Capsule'}

## Purpose
Auto-promoted from Capsule (confidence: ${capsule.confidence}, uses: ${capsule.use_count}, streak: ${capsule.success_streak}).
Review and refine before activating.

## Command
\`/alata:${name}\`

## Process
1. Apply the pattern described below
2. Run verification commands from task_plan.md
3. Confirm results

## Pattern
${capsule.content ?? 'See patch file at ' + (capsule.patch_path ?? 'N/A')}

## Origin
- Capsule ID: ${capsule.capsule_id ?? capsule.asset_id ?? 'unknown'}
- Confidence: ${capsule.confidence}
- Use count: ${capsule.use_count}
- Success streak: ${capsule.success_streak}
- Promoted at: ${new Date().toISOString()}

## Anti-patterns
- Do not apply blindly — verify the pattern fits the current context
- Do not skip verification after applying
`,
  };
}

export function writeSkillDraft(projectRoot, draft) {
  const skillDir = join(projectRoot, 'skills', draft.category, draft.name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'skill.md'), draft.content, 'utf8');
  return skillDir;
}

export function promoteEligibleCapsules(projectRoot) {
  const candidates = findPromotionCandidates(projectRoot);
  const promoted = [];
  for (const capsule of candidates) {
    const draft = generateSkillDraft(capsule);
    const existingDir = join(projectRoot, 'skills', draft.category, draft.name);
    if (existsSync(existingDir)) continue;
    writeSkillDraft(projectRoot, draft);
    promoted.push({ name: draft.name, capsule_id: capsule.capsule_id ?? capsule.asset_id });
  }
  return promoted;
}
