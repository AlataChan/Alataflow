import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { appendProgress } from '../runtime/progress-writer.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch { process.exit(0); }

  const cwd = input.cwd ?? process.cwd();
  const errorLog = join(cwd, '.alataflow', 'error.log');

  function logError(msg) {
    try { appendFileSync(errorLog, new Date().toISOString() + ' [progress-save] ' + msg + '\n'); } catch {}
  }

  try {
    // Step 1: check for active space
    const currentSpaceFile = join(cwd, '.alataflow', 'current_space');
    if (!existsSync(currentSpaceFile)) { process.exit(0); }
    const slug = readFileSync(currentSpaceFile, 'utf8').trim();
    if (!slug) { process.exit(0); }

    // Step 2: extract description from tool input
    const toolName = input.tool_name ?? 'Unknown';
    const toolInput = input.tool_input ?? {};
    let description = '';
    if (toolName === 'Write' || toolName === 'Edit') {
      description = toolInput.file_path ?? '';
    } else if (toolName === 'Bash') {
      description = String(toolInput.command ?? '').slice(0, 80);
    }

    appendProgress(cwd, slug, toolName, description);

    // Step 3: update write_count in session_state
    const stateFile = join(cwd, '.alataflow', 'session_state.json');
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
    state.write_count = (state.write_count ?? 0) + 1;
    writeFileSync(stateFile, JSON.stringify(state), 'utf8');

    // Step 4: memory threshold check
    const memFile = join(cwd, '.alataflow', 'memory.jsonl');
    let memCount = 0;
    if (existsSync(memFile)) {
      memCount = readFileSync(memFile, 'utf8').split('\n').filter(Boolean).length;
    }

    const messages = ['[AlataFlow] Progress saved → .plans/' + slug + '/progress.md'];
    if (memCount >= 50) {
      messages.push('📊 记忆数：' + memCount + '/50，已达同步阈值。运行 /alata:memory sync 触发同步。');
    }

    process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n') }));
  } catch (err) {
    logError(err.message);
  }

  process.exit(0);
}

main();
