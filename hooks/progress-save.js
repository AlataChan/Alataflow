import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { appendProgress } from '../runtime/progress-writer.js';
import { resolveStateRoot } from '../runtime/space-manager.js';

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
    try { appendFileSync(errorLog, new Date().toISOString() + ' [progress-save] ' + msg + '\n'); } catch {}
  }

  try {
    // Step 1: check for active space
    const currentSpaceFile = join(stateRoot, '.alataflow', 'current_space');
    if (!existsSync(currentSpaceFile)) { process.exit(0); }
    const slug = readFileSync(currentSpaceFile, 'utf8').trim();
    if (!slug) { process.exit(0); }

    // Step 2: check experiment mode — partial silence
    const experimentFlag = join(stateRoot, '.alataflow', 'experiment_active.' + slug);
    const inExperiment = existsSync(experimentFlag);

    // Step 3: extract description from tool input
    const toolName = input.tool_name ?? 'Unknown';
    const toolInput = input.tool_input ?? {};
    let description = '';
    if (toolName === 'Write' || toolName === 'Edit') {
      description = toolInput.file_path ?? '';
    } else if (toolName === 'Bash') {
      description = String(toolInput.command ?? '').slice(0, 80);
    }

    const messages = [];

    // Step 4: progress writing — SKIP in experiment mode
    if (!inExperiment) {
      appendProgress(stateRoot, slug, toolName, description);

      // Update write_count in session_state
      const stateFile = join(stateRoot, '.alataflow', 'session_state.json');
      let state = {};
      try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
      state.write_count = (state.write_count ?? 0) + 1;
      writeFileSync(stateFile, JSON.stringify(state), 'utf8');

      messages.push('[AlataFlow] Progress saved → .plans/' + slug + '/progress.md');
    }

    // Step 5: water level monitoring — ALWAYS runs (even in experiment mode)
    const stateFile = join(stateRoot, '.alataflow', 'session_state.json');
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
    const writeCount = state.write_count ?? 0;

    if (writeCount > 0 && writeCount % 20 === 0) {
      const pct = Math.max(0, 100 - writeCount * 1.5);
      if (pct <= 25) {
        messages.push('🔴 CRITICAL: 上下文水位估计 ~' + Math.round(pct) + '%，建议立即 /alata:checkpoint 保存进度后开启新会话。');
      } else if (pct <= 35) {
        messages.push('🟡 WARNING: 上下文水位估计 ~' + Math.round(pct) + '%，建议 /alata:checkpoint 保存关键进度。');
      }
    }

    // Step 6: memory threshold check
    const memFile = join(stateRoot, '.alataflow', 'memory.jsonl');
    let memCount = 0;
    if (existsSync(memFile)) {
      memCount = readFileSync(memFile, 'utf8').split('\n').filter(Boolean).length;
    }
    if (memCount >= 50) {
      messages.push('📊 记忆数：' + memCount + '/50，已达同步阈值。运行 /alata:memory sync 触发同步。');
    }

    if (messages.length > 0) {
      process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n') }));
    }
  } catch (err) {
    logError(err.message);
  }

  process.exit(0);
}

main();
