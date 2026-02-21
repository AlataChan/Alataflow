// Thin bridge: reads stdin, calls runtime, writes stdout.
// On any error: exit 0 (never block session start).
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { initAlataflow } from '../runtime/init.js';
import { loadMemoriesForProject } from '../runtime/memory-loader.js';
import { decayCapsulesInMemoryFile } from '../runtime/capsule-decay.js';
import { getStaleSpaces } from '../runtime/space-manager.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const cwd = input.cwd ?? process.cwd();
  const errorLog = join(cwd, '.alataflow', 'error.log');

  function logError(msg) {
    try {
      appendFileSync(errorLog, new Date().toISOString() + ' [session-start] ' + msg + '\n');
    } catch { /* ignore */ }
  }

  try {
    const messages = [];

    // Step 1: cold-start init
    const isFirstRun = !existsSync(join(cwd, '.alataflow'));
    initAlataflow(cwd);
    if (isFirstRun) {
      messages.push('[AlataFlow] 首次安装完成，已初始化工作目录。运行 /alata:plan 开始第一个任务。');
    }

    // Step 2: write session state
    const sessionState = { started_at: new Date().toISOString(), cwd, write_count: 0 };
    writeFileSync(join(cwd, '.alataflow', 'session_state.json'), JSON.stringify(sessionState), 'utf8');

    // Step 3: load memories
    const memories = loadMemoriesForProject(cwd, cwd);
    if (memories.length > 0) {
      const summaries = memories.map(m => '- ' + m.summary).join('\n');
      messages.push('[AlataFlow] Loaded ' + memories.length + ' memories for this project:\n' + summaries);
    }

    // Step 4: check stale spaces
    const stale = getStaleSpaces(cwd);
    if (stale.length > 0) {
      messages.push('⚠️ ' + stale.length + ' 个 Task Space 已闲置超过 24h：' + stale.map(s => '[' + s.slug + ']').join(', ') + '。运行 /alata:space clean 清理。');
    }

    // Step 5: capsule decay (lazy)
    decayCapsulesInMemoryFile(cwd);

    const additionalContext = messages.join('\n');
    if (additionalContext) {
      process.stdout.write(JSON.stringify({ additionalContext }));
    }
  } catch (err) {
    logError(err.message);
  }

  process.exit(0);
}

main();
