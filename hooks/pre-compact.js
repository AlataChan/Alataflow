// PreCompact Hook: save critical context summary before compression.
// On any error: exit 0 (never block compression).
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { resolveStateRoot, getCurrentSpace } from '../runtime/space-manager.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch { process.exit(0); }

  const cwd = input.cwd ?? process.cwd();
  const stateRoot = resolveStateRoot(cwd);
  const errorLog = join(stateRoot, '.alataflow', 'error.log');

  function logError(msg) {
    try { appendFileSync(errorLog, new Date().toISOString() + ' [pre-compact] ' + msg + '\n'); } catch {}
  }

  try {
    const slug = getCurrentSpace(stateRoot);
    if (!slug) { process.exit(0); }

    // Read current session state
    const stateFile = join(stateRoot, '.alataflow', 'session_state.json');
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}

    // Read progress to capture last entries
    const progressFile = join(stateRoot, '.plans', slug, 'progress.md');
    let lastProgress = '';
    if (existsSync(progressFile)) {
      const lines = readFileSync(progressFile, 'utf8').split('\n').filter(Boolean);
      lastProgress = lines.slice(-10).join('\n');
    }

    // Read task plan step context
    const planFile = join(stateRoot, '.plans', slug, 'task_plan.md');
    let planSummary = '';
    if (existsSync(planFile)) {
      const content = readFileSync(planFile, 'utf8');
      planSummary = content.slice(0, 500);
    }

    // Save compact context summary
    const summary = {
      slug,
      saved_at: new Date().toISOString(),
      write_count: state.write_count ?? 0,
      last_progress: lastProgress,
      plan_summary: planSummary,
    };

    const summaryFile = join(stateRoot, '.plans', slug, 'compact_context.json');
    mkdirSync(dirname(summaryFile), { recursive: true });
    writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

    process.stdout.write(JSON.stringify({
      additionalContext: '[AlataFlow] 压缩前上下文已保存到 .plans/' + slug + '/compact_context.json',
    }));
  } catch (err) {
    logError(err.message);
  }

  process.exit(0);
}

main();
