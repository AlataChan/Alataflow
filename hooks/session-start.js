// Thin bridge: reads stdin, calls runtime, writes stdout.
// On any error: exit 0 (never block session start).
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { initAlataflow } from '../runtime/init.js';
import { loadMemoriesForProject } from '../runtime/memory-loader.js';
import { decayCapsulesInMemoryFile } from '../runtime/capsule-decay.js';
import { getStaleSpaces, resolveStateRoot, getCurrentSpace, backfillSpacePaths, readSpaces, writeSpaces } from '../runtime/space-manager.js';
import { cleanStaleExperimentFlags } from '../runtime/experiment-tracker.js';
import { detectCheckpoint } from '../runtime/checkpoint-manager.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const cwd = input.cwd ?? process.cwd();
  const stateRoot = resolveStateRoot(cwd);
  const errorLog = join(stateRoot, '.alataflow', 'error.log');

  function logError(msg) {
    try {
      appendFileSync(errorLog, new Date().toISOString() + ' [session-start] ' + msg + '\n');
    } catch { /* ignore */ }
  }

  try {
    const messages = [];

    // Step 1: cold-start init
    const isFirstRun = !existsSync(join(stateRoot, '.alataflow'));
    initAlataflow(stateRoot);
    if (isFirstRun) {
      messages.push('[AlataFlow] 首次安装完成，已初始化工作目录。运行 /alata:plan 开始第一个任务。');
    }

    // Step 2: write session state
    const sessionState = { started_at: new Date().toISOString(), cwd, state_root: stateRoot, write_count: 0 };
    writeFileSync(join(stateRoot, '.alataflow', 'session_state.json'), JSON.stringify(sessionState), 'utf8');

    // Step 3: backfill space metadata (v1.1 migration)
    try {
      const spaces = readSpaces(stateRoot);
      if (backfillSpacePaths(stateRoot, spaces)) {
        writeSpaces(stateRoot, spaces);
        messages.push('[AlataFlow] Space 元数据已自动补齐 state_root_path / main_checkout_path 字段。');
      }
    } catch (err) {
      logError('backfill: ' + err.message);
    }

    // Step 4: clean stale experiment flags
    try {
      const cleaned = cleanStaleExperimentFlags(stateRoot);
      if (cleaned.length > 0) {
        messages.push('⚠️ 清理了 ' + cleaned.length + ' 个过期实验标记：' + cleaned.join(', '));
      }
    } catch (err) {
      logError('experiment-cleanup: ' + err.message);
    }

    // Step 5: detect checkpoint for current space
    const currentSlug = getCurrentSpace(stateRoot);
    if (currentSlug) {
      const cp = detectCheckpoint(stateRoot, currentSlug);
      if (cp) {
        messages.push('[AlataFlow] 检测到未完成的 checkpoint（步骤 ' + cp.step_index + '/' + cp.total_steps + '）。' +
                       '运行 /alata:checkpoint resume 继续，或 /alata:checkpoint clear 清除。');
      }
    }

    // Step 6: load memories
    const memories = loadMemoriesForProject(stateRoot, stateRoot);
    if (memories.length > 0) {
      const summaries = memories.map(m => '- ' + m.summary).join('\n');
      messages.push('[AlataFlow] Loaded ' + memories.length + ' memories for this project:\n' + summaries);
    }

    // Step 7: check stale spaces
    const stale = getStaleSpaces(stateRoot);
    if (stale.length > 0) {
      messages.push('⚠️ ' + stale.length + ' 个 Task Space 已闲置超过 24h：' + stale.map(s => '[' + s.slug + ']').join(', ') + '。运行 /alata:space clean 清理。');
    }

    // Step 8: capsule decay (lazy)
    decayCapsulesInMemoryFile(stateRoot);

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
