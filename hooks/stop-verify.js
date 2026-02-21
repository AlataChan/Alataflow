import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  let input;
  let cwd = process.cwd();
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
    cwd = input.cwd ?? process.cwd();
  } catch { process.exit(0); }

  // CRITICAL: prevent infinite loop
  if (input.stop_hook_active) { process.exit(0); }

  try {
    // Check active space
    const currentSpaceFile = join(cwd, '.alataflow', 'current_space');
    if (!existsSync(currentSpaceFile)) { process.exit(0); }
    const slug = readFileSync(currentSpaceFile, 'utf8').trim();
    if (!slug) { process.exit(0); }

    // Check write_count
    const stateFile = join(cwd, '.alataflow', 'session_state.json');
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
    const writeCount = state.write_count ?? 0;

    const messages = [];

    if (writeCount > 0) {
      messages.push('[AlataFlow] 💾 本轮在 [' + slug + '] 中有 ' + writeCount + ' 次写操作，可运行 /alata:evolve extract 提取 Capsule。');
    }

    // Memory threshold warning (pre-warn at 45)
    const memFile = join(cwd, '.alataflow', 'memory.jsonl');
    if (existsSync(memFile)) {
      const count = readFileSync(memFile, 'utf8').split('\n').filter(Boolean).length;
      if (count >= 45) {
        messages.push('📊 记忆数：' + count + '/50，建议运行 /alata:memory sync 同步。');
      }
    }

    // Reset write_count for next turn
    state.write_count = 0;
    writeFileSync(stateFile, JSON.stringify(state), 'utf8');

    if (messages.length > 0) {
      process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n') }));
    }
  } catch (err) {
    try {
      const { appendFileSync } = await import('fs');
      appendFileSync(
        join(cwd, '.alataflow', 'error.log'),
        new Date().toISOString() + ' [stop-verify] ' + (err?.message ?? String(err)) + '\n'
      );
    } catch {}
  }

  process.exit(0);
}

main();
