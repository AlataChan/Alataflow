import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { scanForSensitiveContent } from '../runtime/scrubber-rules.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // crash → allow
  }

  const prompt = input.prompt ?? '';
  const cwd = input.cwd ?? process.cwd();

  try {
    const result = scanForSensitiveContent(prompt);
    if (result.hit) {
      const logPath = join(cwd, '.alataflow', 'scrubber.log');
      try {
        mkdirSync(dirname(logPath), { recursive: true });
        appendFileSync(logPath, new Date().toISOString() + ' rule=' + result.rule + '\n');
      } catch { /* ignore log failure */ }

      process.stderr.write(
        '[AlataFlow/Scrubber] ⚠️ 检测到可能的敏感内容（规则：' + result.rule + '）\n' +
        '请检查 prompt 是否包含 API Key、密码或私钥。\n' +
        '如确认内容安全，可在 prompt 前加 [SAFE] 标记跳过检测。\n'
      );
      process.exit(2);
    }
  } catch {
    // scrubber crash → allow
  }

  process.exit(0);
}

main();
