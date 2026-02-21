# AlataFlow v1.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build AlataFlow — a Claude Code plugin providing structured workflow (planning, memory recall, task isolation, genetic reuse) via Single Spine architecture.

**Architecture:** 4-component system: Skills (Markdown), Runtime (Node.js scripts), Hooks (4 thin event bridges), Adapters (Claude Code plugin package). All state lives in `.alataflow/` (project-local) and `.plans/<space-slug>/` (task plans). Storage is JSONL — zero native dependencies, fully cross-platform.

**Tech Stack:** Node.js (ESM, no native addons), JSONL, Git worktrees, Claude Code Plugin system (plugin.json + hooks.json + skills/)

---

## Phase 0: Skeleton

> Goal: Repo structure, plugin manifest, CLAUDE.md rules, core skill ports. No logic yet.

---

### Task 0.1: Initialize repo structure

**Files:**
- Create: `plugin.json`
- Create: `CLAUDE.md`
- Create: `README.md`
- Create: `.gitignore`
- Create: `hooks/hooks.json`
- Create: `hooks/.gitkeep`
- Create: `runtime/.gitkeep`
- Create: `skills/.gitkeep`
- Create: `docs/plans/.gitkeep`

**Step 1: Create plugin.json**

```json
{
  "name": "alataflow",
  "version": "0.1.0",
  "description": "Structured AI workflow plugin — planning, memory, task isolation, genetic reuse.",
  "author": "AlataFlow",
  "claude_code": {
    "min_version": "1.0.0"
  },
  "hooks": "hooks/hooks.json",
  "skills": "skills/"
}
```

**Step 2: Create CLAUDE.md**

```markdown
# AlataFlow — Project Rules

## Command Namespace
All commands use `/alata:*` prefix. Aliases like `/plan` are thin wrappers only.

## Single Spine
One source of truth: `.alataflow/` for state/memory, `.plans/<space-slug>/` for task plans.
Never duplicate state across files. Never write business logic in hooks.

## File Conventions
- `.alataflow/memory.jsonl` — one JSON object per line, append-only
- `.alataflow/spaces.json` — JSON array, full rewrite on update
- `.alataflow/current_space` — plain text, slug only (e.g. `auth-feature`)
- `.alataflow/session_state.json` — ephemeral session data
- `.plans/<slug>/task_plan.md` — implementation steps
- `.plans/<slug>/findings.md` — discoveries, append-only
- `.plans/<slug>/progress.md` — tool call log, append-only
- `.plans/<slug>/design.md` — design decisions

## Runtime Scripts
All business logic in `runtime/*.js`. Hooks are thin: read stdin, call runtime, write stdout.

## Error Handling
All hooks: on any error, write to `.alataflow/error.log` and exit 0. Never block the user.
Exception: scrubber (UserPromptSubmit) — exit 2 on confirmed hit.

## Storage
JSONL only. No SQLite. No native addons. Zero compilation required.
```

**Step 3: Create .gitignore**

```
node_modules/
.alataflow/session_state.json
.alataflow/error.log
.alataflow/scrubber.log
```

**Step 4: Create empty hooks/hooks.json**

```json
{
  "hooks": {}
}
```

**Step 5: Commit**

```bash
git add plugin.json CLAUDE.md README.md .gitignore hooks/ runtime/ skills/ docs/
git commit -m "chore: initialize AlataFlow plugin skeleton"
```

---

### Task 0.2: Port brainstorming skill from Superpowers

**Files:**
- Create: `skills/workflow/brainstorming/skill.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/workflow/brainstorming
```

**Step 2: Write skill.md**

Content: Adapt from Superpowers brainstorming skill. Key sections:
- Purpose: explore user intent before any implementation
- Process: one question at a time, propose 2-3 approaches, get approval
- Output: save design to `.plans/<space-slug>/design.md`
- Hard gate: no implementation until design approved

Reference the Superpowers brainstorming skill for exact wording. Namespace all commands as `/alata:*`.

**Step 3: Commit**

```bash
git add skills/workflow/brainstorming/
git commit -m "feat: add brainstorming skill (ported from Superpowers)"
```

---

### Task 0.3: Port writing-skills meta skill

**Files:**
- Create: `skills/meta/writing-skills/skill.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/meta/writing-skills
```

**Step 2: Write skill.md**

Content: How to create new AlataFlow skills. Sections:
- Skill file structure (frontmatter, purpose, process, output)
- Naming conventions (`skills/<category>/<name>/skill.md`)
- Testing a skill before commit (invoke manually, check output)
- When to create a skill vs a runtime script

**Step 3: Commit**

```bash
git add skills/meta/writing-skills/
git commit -m "feat: add writing-skills meta skill"
```

---

## Phase 1: Single Spine + Hook System

> Goal: 4 hooks fully wired, scrubber live, cold-start working. This is the nervous system.

---

### Task 1.1: Write runtime/init.js — cold-start initialization

**Files:**
- Create: `runtime/init.js`
- Create: `runtime/init.test.js`

**Step 1: Write failing test**

```js
// runtime/init.test.js
import { strict as assert } from 'assert';
import { existsSync, rmSync, readFileSync } from 'fs';
import { initAlataflow } from './init.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-test-' + Date.now());

describe('initAlataflow', () => {
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('creates .alataflow directory with required files', () => {
    initAlataflow(testDir);
    assert.ok(existsSync(join(testDir, '.alataflow/memory.jsonl')));
    assert.ok(existsSync(join(testDir, '.alataflow/spaces.json')));
    assert.ok(existsSync(join(testDir, '.alataflow/session_state.json')));
    assert.strictEqual(readFileSync(join(testDir, '.alataflow/spaces.json'), 'utf8'), '[]');
    assert.strictEqual(readFileSync(join(testDir, '.alataflow/session_state.json'), 'utf8'), '{}');
  });

  it('is idempotent — safe to call twice', () => {
    initAlataflow(testDir);
    initAlataflow(testDir); // should not throw or overwrite
    assert.ok(existsSync(join(testDir, '.alataflow/memory.jsonl')));
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test runtime/init.test.js
```
Expected: FAIL — `initAlataflow is not a function` or module not found.

**Step 3: Implement runtime/init.js**

```js
// runtime/init.js
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function initAlataflow(projectRoot) {
  const dir = join(projectRoot, '.alataflow');
  mkdirSync(dir, { recursive: true });

  const files = {
    'memory.jsonl': '',
    'spaces.json': '[]',
    'session_state.json': '{}',
  };

  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    if (!existsSync(path)) {
      writeFileSync(path, content, 'utf8');
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
node --test runtime/init.test.js
```
Expected: PASS — 2 tests passing.

**Step 5: Commit**

```bash
git add runtime/init.js runtime/init.test.js
git commit -m "feat: add runtime/init.js — cold-start directory initialization"
```

---

### Task 1.2: Write runtime/scrubber-rules.js

**Files:**
- Create: `runtime/scrubber-rules.js`
- Create: `runtime/scrubber-rules.test.js`

**Step 1: Write failing tests**

```js
// runtime/scrubber-rules.test.js
import { strict as assert } from 'assert';
import { scanForSensitiveContent } from './scrubber-rules.js';

describe('scanForSensitiveContent', () => {
  it('detects OpenAI API key pattern', () => {
    const result = scanForSensitiveContent('use key sk-abc123def456ghi789jkl012mno345');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'api-key');
  });

  it('detects PEM private key', () => {
    const result = scanForSensitiveContent('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'private-key');
  });

  it('detects inline password assignment', () => {
    const result = scanForSensitiveContent('password = supersecretpass123');
    assert.ok(result.hit);
    assert.strictEqual(result.rule, 'password-field');
  });

  it('passes clean text', () => {
    const result = scanForSensitiveContent('add user authentication with OAuth2');
    assert.ok(!result.hit);
  });

  it('respects [SAFE] prefix bypass', () => {
    const result = scanForSensitiveContent('[SAFE] sk-abc123def456ghi789jkl012mno345');
    assert.ok(!result.hit);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/scrubber-rules.test.js
```
Expected: FAIL.

**Step 3: Implement scrubber-rules.js**

```js
// runtime/scrubber-rules.js

function shannonEntropy(str) {
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  return Object.values(freq).reduce((e, f) => {
    const p = f / str.length;
    return e - p * Math.log2(p);
  }, 0);
}

const RULES = [
  {
    name: 'api-key',
    test: (text) => /(sk-[a-zA-Z0-9]{20,}|Bearer [a-zA-Z0-9+/=]{20,})/.test(text),
  },
  {
    name: 'private-key',
    test: (text) => /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/.test(text),
  },
  {
    name: 'password-field',
    test: (text) => /password\s*[:=]\s*\S{8,}/i.test(text),
  },
  {
    name: 'high-entropy',
    test: (text) => {
      const tokens = text.split(/\s+/).filter(t => t.length > 20);
      return tokens.some(t => shannonEntropy(t) > 4.5);
    },
  },
];

export function scanForSensitiveContent(text) {
  if (text.trimStart().startsWith('[SAFE]')) {
    return { hit: false };
  }
  for (const rule of RULES) {
    if (rule.test(text)) {
      return { hit: true, rule: rule.name };
    }
  }
  return { hit: false };
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/scrubber-rules.test.js
```
Expected: PASS — 5 tests.

**Step 5: Commit**

```bash
git add runtime/scrubber-rules.js runtime/scrubber-rules.test.js
git commit -m "feat: add scrubber-rules.js — privacy content detection"
```

---

### Task 1.3: Write runtime/memory-loader.js

**Files:**
- Create: `runtime/memory-loader.js`
- Create: `runtime/memory-loader.test.js`

**Step 1: Write failing tests**

```js
// runtime/memory-loader.test.js
import { strict as assert } from 'assert';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { loadMemoriesForProject } from './memory-loader.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-mem-test-' + Date.now());
const memoryFile = join(testDir, '.alataflow', 'memory.jsonl');

const memories = [
  { asset_id: '1', kind: 'memory', summary: 'Use FastAPI', tags: { project: '/my/project' }, last_used_at: '2026-02-20T00:00:00Z' },
  { asset_id: '2', kind: 'memory', summary: 'Other project note', tags: { project: '/other/project' }, last_used_at: '2026-02-19T00:00:00Z' },
  { asset_id: '3', kind: 'memory', summary: 'FastAPI v2 patterns', tags: { project: '/my/project' }, last_used_at: '2026-02-18T00:00:00Z' },
];

describe('loadMemoriesForProject', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    writeFileSync(memoryFile, memories.map(m => JSON.stringify(m)).join('\n'), 'utf8');
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('returns only memories matching project cwd', () => {
    const result = loadMemoriesForProject(testDir, '/my/project');
    assert.strictEqual(result.length, 2);
    assert.ok(result.every(m => m.tags.project === '/my/project'));
  });

  it('returns memories sorted by last_used_at descending', () => {
    const result = loadMemoriesForProject(testDir, '/my/project');
    assert.strictEqual(result[0].asset_id, '1');
    assert.strictEqual(result[1].asset_id, '3');
  });

  it('returns empty array when memory file missing', () => {
    const result = loadMemoriesForProject('/nonexistent', '/my/project');
    assert.deepStrictEqual(result, []);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/memory-loader.test.js
```

**Step 3: Implement memory-loader.js**

```js
// runtime/memory-loader.js
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function loadMemoriesForProject(projectRoot, cwd, limit = 10) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return [];

  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const memories = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  return memories
    .filter(m => m.tags?.project === cwd)
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, limit);
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/memory-loader.test.js
```
Expected: PASS — 3 tests.

**Step 5: Commit**

```bash
git add runtime/memory-loader.js runtime/memory-loader.test.js
git commit -m "feat: add memory-loader.js — project-scoped memory retrieval"
```

---

### Task 1.4: Write runtime/capsule-decay.js

**Files:**
- Create: `runtime/capsule-decay.js`
- Create: `runtime/capsule-decay.test.js`

**Step 1: Write failing tests**

```js
// runtime/capsule-decay.test.js
import { strict as assert } from 'assert';
import { applyMonthlyDecay } from './capsule-decay.js';

describe('applyMonthlyDecay', () => {
  it('decays capsule unused for 31 days', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.8, last_used_at: oldDate }];
    const result = applyMonthlyDecay(capsules);
    assert.ok(result[0].confidence < 0.8);
    assert.ok(Math.abs(result[0].confidence - 0.8 * 0.95) < 0.0001);
  });

  it('does not decay capsule used within 30 days', () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.8, last_used_at: recentDate }];
    const result = applyMonthlyDecay(capsules);
    assert.strictEqual(result[0].confidence, 0.8);
  });

  it('respects minimum confidence floor of 0.10', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const capsules = [{ kind: 'capsule', confidence: 0.10, last_used_at: oldDate }];
    const result = applyMonthlyDecay(capsules);
    assert.strictEqual(result[0].confidence, 0.10);
  });

  it('skips non-capsule entries', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const entries = [{ kind: 'memory', confidence: 0.8, last_used_at: oldDate }];
    const result = applyMonthlyDecay(entries);
    assert.strictEqual(result[0].confidence, 0.8);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/capsule-decay.test.js
```

**Step 3: Implement capsule-decay.js**

```js
// runtime/capsule-decay.js
const DECAY_FACTOR = 0.95;
const CONFIDENCE_FLOOR = 0.10;
const DECAY_THRESHOLD_DAYS = 30;

export function applyMonthlyDecay(entries) {
  const now = Date.now();
  return entries.map(entry => {
    if (entry.kind !== 'capsule') return entry;
    const lastUsed = new Date(entry.last_used_at).getTime();
    const daysSince = (now - lastUsed) / (1000 * 60 * 60 * 24);
    if (daysSince <= DECAY_THRESHOLD_DAYS) return entry;
    const decayed = Math.max(CONFIDENCE_FLOOR, entry.confidence * DECAY_FACTOR);
    return { ...entry, confidence: Math.round(decayed * 10000) / 10000 };
  });
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/capsule-decay.test.js
```
Expected: PASS — 4 tests.

**Step 5: Commit**

```bash
git add runtime/capsule-decay.js runtime/capsule-decay.test.js
git commit -m "feat: add capsule-decay.js — monthly confidence decay (lazy)"
```

---

### Task 1.5: Wire Hook 1 — hooks/session-start.js

**Files:**
- Create: `hooks/session-start.js`

**Step 1: Write hook entry point**

```js
// hooks/session-start.js
// Thin bridge: reads stdin, calls runtime, writes stdout.
// On any error: exit 0 (never block session start).

import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { initAlataflow } from '../runtime/init.js';
import { loadMemoriesForProject } from '../runtime/memory-loader.js';
import { applyMonthlyDecay } from '../runtime/capsule-decay.js';

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
      appendFileSync(errorLog, `${new Date().toISOString()} [session-start] ${msg}\n`);
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
      const summaries = memories.map(m => `- ${m.summary}`).join('\n');
      messages.push(`[AlataFlow] Loaded ${memories.length} memories for this project:\n${summaries}`);
    }

    // Step 4: check stale spaces
    const spacesFile = join(cwd, '.alataflow', 'spaces.json');
    if (existsSync(spacesFile)) {
      const spaces = JSON.parse(readFileSync(spacesFile, 'utf8'));
      const now = Date.now();
      const stale = spaces.filter(s => {
        if (s.status === 'completed') return false;
        const last = new Date(s.last_active).getTime();
        return (now - last) > 24 * 60 * 60 * 1000;
      });
      if (stale.length > 0) {
        messages.push(`⚠️ ${stale.length} 个 Task Space 已闲置超过 24h：${stale.map(s => `[${s.slug}]`).join(', ')}。运行 /alata:space clean 清理。`);
      }
    }

    // Step 5: capsule decay (lazy)
    const memFile = join(cwd, '.alataflow', 'memory.jsonl');
    if (existsSync(memFile)) {
      const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
      const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const decayed = applyMonthlyDecay(entries);
      const changed = decayed.some((e, i) => e.confidence !== entries[i]?.confidence);
      if (changed) {
        writeFileSync(memFile, decayed.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
      }
    }

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
```

**Step 2: Manual smoke test**

```bash
echo '{"cwd":"/tmp/test-alataflow","hook_event_name":"SessionStart"}' | node hooks/session-start.js
```
Expected: JSON output with `additionalContext` containing first-run message.

**Step 3: Verify idempotent (run twice)**

```bash
echo '{"cwd":"/tmp/test-alataflow","hook_event_name":"SessionStart"}' | node hooks/session-start.js
```
Expected: No error, no duplicate files.

**Step 4: Commit**

```bash
git add hooks/session-start.js
git commit -m "feat: wire session-start hook — cold-start, memory load, capsule decay"
```

---

### Task 1.6: Wire Hook 2 — hooks/scrubber.js

**Files:**
- Create: `hooks/scrubber.js`

**Step 1: Write hook**

```js
// hooks/scrubber.js
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
        appendFileSync(logPath, `${new Date().toISOString()} rule=${result.rule}\n`);
      } catch { /* ignore log failure */ }

      process.stderr.write(
        `[AlataFlow/Scrubber] ⚠️ 检测到可能的敏感内容（规则：${result.rule}）\n` +
        `请检查 prompt 是否包含 API Key、密码或私钥。\n` +
        `如确认内容安全，可在 prompt 前加 [SAFE] 标记跳过检测。\n`
      );
      process.exit(2);
    }
  } catch {
    // scrubber crash → allow
  }

  process.exit(0);
}

main();
```

**Step 2: Smoke test — clean prompt**

```bash
echo '{"prompt":"add user authentication","cwd":"/tmp/test-alataflow"}' | node hooks/scrubber.js
echo "Exit code: $?"
```
Expected: exit 0, no output.

**Step 3: Smoke test — API key in prompt**

```bash
echo '{"prompt":"use sk-abc123def456ghi789jkl012mno345 as the key","cwd":"/tmp/test-alataflow"}' | node hooks/scrubber.js
echo "Exit code: $?"
```
Expected: exit 2, stderr warning message.

**Step 4: Smoke test — [SAFE] bypass**

```bash
echo '{"prompt":"[SAFE] sk-abc123def456ghi789jkl012mno345","cwd":"/tmp/test-alataflow"}' | node hooks/scrubber.js
echo "Exit code: $?"
```
Expected: exit 0.

**Step 5: Commit**

```bash
git add hooks/scrubber.js
git commit -m "feat: wire scrubber hook — privacy guard on UserPromptSubmit"
```

---

### Task 1.7: Write runtime/progress-writer.js

**Files:**
- Create: `runtime/progress-writer.js`
- Create: `runtime/progress-writer.test.js`

**Step 1: Write failing tests**

```js
// runtime/progress-writer.test.js
import { strict as assert } from 'assert';
import { mkdirSync, readFileSync, rmSync } from 'fs';
import { appendProgress } from './progress-writer.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-progress-' + Date.now());

describe('appendProgress', () => {
  before(() => mkdirSync(join(testDir, '.plans', 'auth-feature'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('appends a timestamped line to progress.md', () => {
    appendProgress(testDir, 'auth-feature', 'Write', 'src/auth/models.py');
    const content = readFileSync(join(testDir, '.plans', 'auth-feature', 'progress.md'), 'utf8');
    assert.ok(content.includes('[Write]'));
    assert.ok(content.includes('src/auth/models.py'));
  });

  it('appends (does not overwrite) on second call', () => {
    appendProgress(testDir, 'auth-feature', 'Edit', 'src/auth/routes.py');
    const content = readFileSync(join(testDir, '.plans', 'auth-feature', 'progress.md'), 'utf8');
    const lines = content.split('\n').filter(Boolean);
    assert.ok(lines.length >= 2);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/progress-writer.test.js
```

**Step 3: Implement progress-writer.js**

```js
// runtime/progress-writer.js
import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export function appendProgress(projectRoot, spaceSlug, toolName, description) {
  const filePath = join(projectRoot, '.plans', spaceSlug, 'progress.md');
  mkdirSync(dirname(filePath), { recursive: true });
  const truncated = String(description).slice(0, 120);
  const line = `[${new Date().toISOString()}] [${toolName}] ${truncated}\n`;
  appendFileSync(filePath, line, 'utf8');
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/progress-writer.test.js
```

**Step 5: Commit**

```bash
git add runtime/progress-writer.js runtime/progress-writer.test.js
git commit -m "feat: add progress-writer.js — append-only tool call logging"
```

---

### Task 1.8: Wire Hook 3 — hooks/progress-save.js

**Files:**
- Create: `hooks/progress-save.js`

**Step 1: Write hook**

```js
// hooks/progress-save.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
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
    try { require('fs').appendFileSync(errorLog, `${new Date().toISOString()} [progress-save] ${msg}\n`); } catch {}
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

    const messages = [`[AlataFlow] Progress saved → .plans/${slug}/progress.md`];
    if (memCount >= 50) {
      messages.push(`📊 记忆数：${memCount}/50，已达同步阈值。运行 /alata:memory sync 触发同步。`);
    }

    process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n') }));
  } catch (err) {
    logError(err.message);
  }

  process.exit(0);
}

main();
```

**Step 2: Smoke test**

```bash
# setup
mkdir -p /tmp/test-alataflow/.alataflow /tmp/test-alataflow/.plans/auth-feature
echo "auth-feature" > /tmp/test-alataflow/.alataflow/current_space
echo '{}' > /tmp/test-alataflow/.alataflow/session_state.json

# run
echo '{"tool_name":"Write","tool_input":{"file_path":"src/auth/models.py"},"cwd":"/tmp/test-alataflow"}' | node hooks/progress-save.js
```
Expected: JSON with `additionalContext` message. Check file exists:
```bash
cat /tmp/test-alataflow/.plans/auth-feature/progress.md
```

**Step 3: Commit**

```bash
git add hooks/progress-save.js
git commit -m "feat: wire progress-save hook — auto-persist tool calls to progress.md"
```

---

### Task 1.9: Wire Hook 4 — hooks/stop-verify.js

**Files:**
- Create: `hooks/stop-verify.js`

**Step 1: Write hook**

```js
// hooks/stop-verify.js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch { process.exit(0); }

  // CRITICAL: prevent infinite loop
  if (input.stop_hook_active) { process.exit(0); }

  const cwd = input.cwd ?? process.cwd();

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
      messages.push(`[AlataFlow] 💾 本轮在 [${slug}] 中有 ${writeCount} 次写操作，可运行 /alata:evolve extract 提取 Capsule。`);
    }

    // Memory threshold warning (pre-warn at 45)
    const memFile = join(cwd, '.alataflow', 'memory.jsonl');
    if (existsSync(memFile)) {
      const count = readFileSync(memFile, 'utf8').split('\n').filter(Boolean).length;
      if (count >= 45) {
        messages.push(`📊 记忆数：${count}/50，建议运行 /alata:memory sync 同步。`);
      }
    }

    // Reset write_count for next turn
    state.write_count = 0;
    writeFileSync(stateFile, JSON.stringify(state), 'utf8');

    if (messages.length > 0) {
      process.stdout.write(JSON.stringify({ additionalContext: messages.join('\n') }));
    }
  } catch {
    // never block stop
  }

  process.exit(0);
}

main();
```

**Step 2: Smoke test — stop_hook_active guard**

```bash
echo '{"stop_hook_active":true,"cwd":"/tmp/test-alataflow"}' | node hooks/stop-verify.js
echo "Exit: $?"
```
Expected: exit 0, no output.

**Step 3: Smoke test — with active space and writes**

```bash
echo '{}' > /tmp/test-alataflow/.alataflow/session_state.json
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('/tmp/test-alataflow/.alataflow/session_state.json'));s.write_count=3;fs.writeFileSync('/tmp/test-alataflow/.alataflow/session_state.json',JSON.stringify(s));"
echo '{"stop_hook_active":false,"cwd":"/tmp/test-alataflow"}' | node hooks/stop-verify.js
```
Expected: JSON with Capsule extract suggestion.

**Step 4: Commit**

```bash
git add hooks/stop-verify.js
git commit -m "feat: wire stop-verify hook — capsule extract prompt + memory warning"
```

---

### Task 1.10: Register all hooks in hooks.json

**Files:**
- Modify: `hooks/hooks.json`

**Step 1: Write final hooks.json**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": ["startup", "resume", "clear", "compact"],
        "hooks": [
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scrubber.js" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ["Write", "Edit", "Bash"],
        "hooks": [
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/progress-save.js" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/stop-verify.js" }
        ]
      }
    ]
  }
}
```

**Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('valid')"
```
Expected: `valid`

**Step 3: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat: register all 4 hooks in hooks.json — Phase 1 complete"
```

---

## Phase 2: Task Space

> Goal: Git worktree abstraction. Users never touch `git worktree` directly.

---

### Task 2.1: Write runtime/space-manager.js

**Files:**
- Create: `runtime/space-manager.js`
- Create: `runtime/space-manager.test.js`

**Step 1: Write failing tests**

```js
// runtime/space-manager.test.js
import { strict as assert } from 'assert';
import { generateSpaceMeta } from './space-manager.js';

describe('generateSpaceMeta', () => {
  it('generates slug from task description', () => {
    const meta = generateSpaceMeta('Add user authentication with OAuth2');
    assert.ok(meta.slug.startsWith('user-auth') || meta.slug.includes('auth'));
    assert.ok(meta.branch.startsWith('alataflow/'));
  });

  it('generates feature branch for feature type', () => {
    const meta = generateSpaceMeta('Add login page', 'feature');
    assert.strictEqual(meta.branch, `alataflow/feature/${meta.slug}`);
  });

  it('generates bugfix branch for bugfix type', () => {
    const meta = generateSpaceMeta('Fix login redirect', 'bugfix');
    assert.ok(meta.branch.startsWith('alataflow/bugfix/'));
  });

  it('slug is lowercase kebab-case, max 30 chars', () => {
    const meta = generateSpaceMeta('This is a very long task description that exceeds limits', 'feature');
    assert.ok(meta.slug.length <= 30);
    assert.ok(/^[a-z0-9-]+$/.test(meta.slug));
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/space-manager.test.js
```

**Step 3: Implement space-manager.js**

```js
// runtime/space-manager.js
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
    branch: `alataflow/${type}/${slug}`,
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
```

**Step 4: Run to verify passes**

```bash
node --test runtime/space-manager.test.js
```

**Step 5: Commit**

```bash
git add runtime/space-manager.js runtime/space-manager.test.js
git commit -m "feat: add space-manager.js — Task Space CRUD and slug generation"
```

---

### Task 2.2: Write task-space skill

**Files:**
- Create: `skills/workflow/task-space/skill.md`

**Step 1: Create directory**

```bash
mkdir -p skills/workflow/task-space
```

**Step 2: Write skill.md**

Sections to cover:
- **Purpose**: Git worktree abstraction — user never needs to know about `git worktree`
- **When to invoke**: automatically after brainstorming approves a design
- **Create flow**: generate slug → create worktree → init 3-File Pattern → update spaces.json → set current_space
- **Status flow**: read spaces.json + git status → display table
- **Clean flow**: list completed/stale spaces → confirm → delete worktree + remove from spaces.json
- **Git decisions**: `.plans/` lives on main branch (worktree branch only carries code changes); on merge, plans stay behind via `.gitignore` or manual exclusion
- **Commands**: `/alata:space create <description>`, `/alata:space status`, `/alata:space clean`, `/alata:space switch <slug>`
- **Failure safety**: before creating worktree, stash any uncommitted changes in current branch

**Step 3: Commit**

```bash
git add skills/workflow/task-space/
git commit -m "feat: add task-space skill — worktree abstraction with UX layer"
```

---

### Task 2.3: Write planning skill

**Files:**
- Create: `skills/workflow/planning/skill.md`

**Step 1: Create directory**

```bash
mkdir -p skills/workflow/planning
```

**Step 2: Write skill.md**

Sections:
- **Purpose**: Create task_plan.md, findings.md, progress.md for a Task Space
- **3-File Pattern**: task_plan.md (steps), findings.md (discoveries, append-only), progress.md (auto-managed by hook)
- **Planning modes**: repair / optimize / innovate (from alataflow.md spec)
- **Integration**: runs after task-space creates the space; writes to `.plans/<slug>/`
- **Output**: task_plan.md with bite-sized tasks, estimated complexity
- **Command**: `/alata:plan <description>` (wraps brainstorming → task-space → planning)

**Step 3: Commit**

```bash
git add skills/workflow/planning/
git commit -m "feat: add planning skill — 3-File Pattern with repair/optimize/innovate modes"
```

---

## Phase 3: Memory Layer

> Goal: JSONL-based L0/L1 memory. `/alata:recall`, `/alata:remember`, `/alata:memory status`.

---

### Task 3.1: Write runtime/memory-writer.js

**Files:**
- Create: `runtime/memory-writer.js`
- Create: `runtime/memory-writer.test.js`

**Step 1: Write failing tests**

```js
// runtime/memory-writer.test.js
import { strict as assert } from 'assert';
import { mkdirSync, readFileSync, rmSync } from 'fs';
import { writeMemory } from './memory-writer.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-writer-' + Date.now());

describe('writeMemory', () => {
  before(() => mkdirSync(join(testDir, '.alataflow'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('appends a valid JSON line to memory.jsonl', () => {
    const id = writeMemory(testDir, {
      kind: 'memory',
      summary: 'FastAPI needs CORS for OAuth callbacks',
      tags: { project: testDir, type: 'pattern', area: 'auth' },
    });
    assert.ok(id.startsWith('sha256:'));
    const lines = readFileSync(join(testDir, '.alataflow', 'memory.jsonl'), 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.summary, 'FastAPI needs CORS for OAuth callbacks');
    assert.ok(entry.created_at);
    assert.ok(entry.updated_at);
  });

  it('scrubs API keys from content before writing', () => {
    writeMemory(testDir, {
      kind: 'memory',
      summary: 'Config note',
      content: 'key = sk-abc123def456ghi789jkl012mno345',
      tags: { project: testDir },
    });
    const lines = readFileSync(join(testDir, '.alataflow', 'memory.jsonl'), 'utf8').split('\n').filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]);
    assert.ok(!last.content.includes('sk-'));
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/memory-writer.test.js
```

**Step 3: Implement memory-writer.js**

```js
// runtime/memory-writer.js
import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { scanForSensitiveContent } from './scrubber-rules.js';

function scrubText(text) {
  if (!text) return text;
  // Replace detected sensitive patterns with [REDACTED]
  return text
    .replace(/(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED]')
    .replace(/(Bearer [a-zA-Z0-9+/=]{20,})/g, 'Bearer [REDACTED]')
    .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, '[REDACTED_KEY]')
    .replace(/(password\s*[:=]\s*)\S{8,}/gi, '$1[REDACTED]');
}

export function writeMemory(projectRoot, entry) {
  const now = new Date().toISOString();
  const content = scrubText(entry.content ?? '');
  const summary = scrubText(entry.summary ?? '');

  const record = {
    ...entry,
    summary,
    content,
    asset_id: `sha256:${createHash('sha256').update(summary + now).digest('hex').slice(0, 16)}`,
    confidence: entry.confidence ?? 0.5,
    success_streak: entry.success_streak ?? 0,
    validation: entry.validation ?? 'unverified',
    use_count: 0,
    last_used_at: now,
    created_at: now,
    updated_at: now,
    synced_at: null,
  };

  const filePath = join(projectRoot, '.alataflow', 'memory.jsonl');
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');

  return record.asset_id;
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/memory-writer.test.js
```

**Step 5: Commit**

```bash
git add runtime/memory-writer.js runtime/memory-writer.test.js
git commit -m "feat: add memory-writer.js — scrubbed append-only JSONL memory storage"
```

---

### Task 3.2: Write runtime/memory-search.js

**Files:**
- Create: `runtime/memory-search.js`
- Create: `runtime/memory-search.test.js`

**Step 1: Write failing tests**

```js
// runtime/memory-search.test.js
import { strict as assert } from 'assert';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { searchMemory } from './memory-search.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-search-' + Date.now());

const entries = [
  { asset_id: '1', summary: 'FastAPI needs CORS for OAuth', tags: { project: testDir, type: 'pattern' }, kind: 'memory', last_used_at: '2026-02-20T00:00:00Z' },
  { asset_id: '2', summary: 'Use pydantic v2 for validation', tags: { project: testDir, type: 'pattern' }, kind: 'memory', last_used_at: '2026-02-19T00:00:00Z' },
  { asset_id: '3', summary: 'PostgreSQL utf8 encoding issue', tags: { project: testDir, type: 'lesson' }, kind: 'memory', last_used_at: '2026-02-18T00:00:00Z' },
];

describe('searchMemory', () => {
  before(() => {
    mkdirSync(join(testDir, '.alataflow'), { recursive: true });
    writeFileSync(join(testDir, '.alataflow', 'memory.jsonl'), entries.map(e => JSON.stringify(e)).join('\n'), 'utf8');
  });
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('finds entries by keyword in summary', () => {
    const results = searchMemory(testDir, { query: 'FastAPI' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].asset_id, '1');
  });

  it('filters by tag type', () => {
    const results = searchMemory(testDir, { tags: { type: 'lesson' } });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].asset_id, '3');
  });

  it('returns all when no query or filter', () => {
    const results = searchMemory(testDir, {});
    assert.strictEqual(results.length, 3);
  });

  it('is case-insensitive', () => {
    const results = searchMemory(testDir, { query: 'fastapi' });
    assert.strictEqual(results.length, 1);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/memory-search.test.js
```

**Step 3: Implement memory-search.js**

```js
// runtime/memory-search.js
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function searchMemory(projectRoot, { query = '', tags = {}, limit = 20 } = {}) {
  const memFile = join(projectRoot, '.alataflow', 'memory.jsonl');
  if (!existsSync(memFile)) return [];

  const lines = readFileSync(memFile, 'utf8').split('\n').filter(Boolean);
  const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const lowerQuery = query.toLowerCase();

  return entries
    .filter(e => {
      if (query && !`${e.summary ?? ''} ${e.content ?? ''}`.toLowerCase().includes(lowerQuery)) return false;
      for (const [k, v] of Object.entries(tags)) {
        if (e.tags?.[k] !== v) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
    .slice(0, limit);
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/memory-search.test.js
```

**Step 5: Commit**

```bash
git add runtime/memory-search.js runtime/memory-search.test.js
git commit -m "feat: add memory-search.js — keyword + tag filtered JSONL search"
```

---

### Task 3.3: Write memory-recall skill

**Files:**
- Create: `skills/context/memory-recall/skill.md`

**Step 1: Create directory**

```bash
mkdir -p skills/context/memory-recall
```

**Step 2: Write skill.md**

Sections:
- **Purpose**: surface relevant past knowledge before starting work
- **When**: automatically at session start (hook injects top 10); manually via `/alata:recall <query>`
- **Process**: search memory.jsonl by query + project tag → display results ranked by last_used_at → update use_count on accessed entries
- **Commands**: `/alata:recall <query>`, `/alata:remember <note>`, `/alata:memory status`
- **memory status output**: total count, by kind (memory/capsule/gene), last sync date, threshold warning

**Step 3: Commit**

```bash
git add skills/context/memory-recall/
git commit -m "feat: add memory-recall skill — /alata:recall, /alata:remember, /alata:memory status"
```

---

## Phase 4: GEP-lite Evolution Layer

> Goal: Gene + Capsule extract/apply. Confidence tracking. Manual promotion path.

---

### Task 4.1: Write runtime/evolution-manager.js

**Files:**
- Create: `runtime/evolution-manager.js`
- Create: `runtime/evolution-manager.test.js`

**Step 1: Write failing tests**

```js
// runtime/evolution-manager.test.js
import { strict as assert } from 'assert';
import { mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { extractCapsule, updateCapsuleStats } from './evolution-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'alataflow-evo-' + Date.now());

describe('extractCapsule', () => {
  before(() => mkdirSync(join(testDir, '.alataflow', 'evolution', 'capsules'), { recursive: true }));
  after(() => rmSync(testDir, { recursive: true, force: true }));

  it('creates capsule directory with capsule.json and validation.md', () => {
    const id = extractCapsule(testDir, {
      summary: 'FastAPI OAuth2 setup pattern',
      gene_id: 'gene-001',
      patch_diff: 'diff --git a/src/auth.py b/src/auth.py\n+from fastapi.security import OAuth2PasswordBearer',
      validation_notes: 'pytest tests/test_auth.py — 12 passed',
      tags: { project: testDir, type: 'pattern', area: 'auth' },
    });
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'capsule.json')));
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'patch.diff')));
    assert.ok(existsSync(join(testDir, '.alataflow', 'evolution', 'capsules', id, 'validation.md')));
  });
});

describe('updateCapsuleStats', () => {
  it('increments confidence on success', () => {
    const before = { confidence: 0.5, success_streak: 2, use_count: 5 };
    const after = updateCapsuleStats(before, true);
    assert.ok(after.confidence > before.confidence);
    assert.strictEqual(after.success_streak, 3);
    assert.strictEqual(after.use_count, 6);
  });

  it('decrements confidence on failure and resets streak', () => {
    const before = { confidence: 0.5, success_streak: 3, use_count: 5 };
    const after = updateCapsuleStats(before, false);
    assert.ok(after.confidence < before.confidence);
    assert.strictEqual(after.success_streak, 0);
  });

  it('respects confidence ceiling of 0.95', () => {
    const before = { confidence: 0.94, success_streak: 10, use_count: 20 };
    const after = updateCapsuleStats(before, true);
    assert.ok(after.confidence <= 0.95);
  });
});
```

**Step 2: Run to verify fails**

```bash
node --test runtime/evolution-manager.test.js
```

**Step 3: Implement evolution-manager.js**

```js
// runtime/evolution-manager.js
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export function extractCapsule(projectRoot, { summary, gene_id, patch_diff, validation_notes, tags }) {
  const now = new Date().toISOString();
  const id = `cap-${createHash('sha256').update(summary + now).digest('hex').slice(0, 12)}`;
  const capsuleDir = join(projectRoot, '.alataflow', 'evolution', 'capsules', id);
  mkdirSync(capsuleDir, { recursive: true });

  const capsule = {
    capsule_id: id,
    gene_id: gene_id ?? null,
    summary,
    tags,
    confidence: 0.5,
    success_streak: 0,
    use_count: 0,
    validation: 'verified',
    created_at: now,
    updated_at: now,
    last_used_at: now,
    patch_path: join(capsuleDir, 'patch.diff'),
  };

  writeFileSync(join(capsuleDir, 'capsule.json'), JSON.stringify(capsule, null, 2), 'utf8');
  writeFileSync(join(capsuleDir, 'patch.diff'), patch_diff ?? '', 'utf8');
  writeFileSync(join(capsuleDir, 'validation.md'), `# Validation Report\n\n${validation_notes ?? ''}\n`, 'utf8');

  return id;
}

export function updateCapsuleStats(stats, success) {
  const CONFIDENCE_CEILING = 0.95;
  const CONFIDENCE_FLOOR = 0.10;

  if (success) {
    return {
      ...stats,
      confidence: Math.min(CONFIDENCE_CEILING, Math.round((stats.confidence + 0.05) * 10000) / 10000),
      success_streak: stats.success_streak + 1,
      use_count: stats.use_count + 1,
      last_used_at: new Date().toISOString(),
    };
  } else {
    return {
      ...stats,
      confidence: Math.max(CONFIDENCE_FLOOR, Math.round((stats.confidence - 0.10) * 10000) / 10000),
      success_streak: 0,
      use_count: stats.use_count + 1,
      last_used_at: new Date().toISOString(),
    };
  }
}
```

**Step 4: Run to verify passes**

```bash
node --test runtime/evolution-manager.test.js
```

**Step 5: Commit**

```bash
git add runtime/evolution-manager.js runtime/evolution-manager.test.js
git commit -m "feat: add evolution-manager.js — Capsule extract and confidence tracking"
```

---

### Task 4.2: Write capsule-extract skill

**Files:**
- Create: `skills/evolution/capsule-extract/skill.md`

**Step 1: Create directory**

```bash
mkdir -p skills/evolution/capsule-extract
```

**Step 2: Write skill.md**

Sections:
- **Purpose**: package a verified solution into a reusable Gene + Capsule
- **When to invoke**: after verification-loop passes; Stop Hook prompts when write_count > 0
- **Process**:
  1. Run `git diff HEAD` to get patch
  2. Ask user for summary and validation notes (what tests passed)
  3. Call `extractCapsule()` via runtime
  4. Write capsule ID to findings.md
  5. Optionally link to a Gene template
- **Output**: `.alataflow/evolution/capsules/<id>/` with capsule.json, patch.diff, validation.md
- **Command**: `/alata:evolve extract`

**Step 3: Commit**

```bash
git add skills/evolution/capsule-extract/
git commit -m "feat: add capsule-extract skill — package verified solutions as Capsules"
```

---

### Task 4.3: Write capsule-apply skill

**Files:**
- Create: `skills/evolution/capsule-apply/skill.md`

**Step 1: Create directory**

```bash
mkdir -p skills/evolution/capsule-apply
```

**Step 2: Write skill.md**

Sections:
- **Purpose**: recall and apply a past Capsule in a new Task Space
- **When**: during `/alata:plan` — search for matching Capsules before generating new plan
- **Process**:
  1. Search capsules by tags/summary keyword
  2. Display matches with confidence score
  3. User selects; apply `git apply patch.diff` in current Task Space
  4. Run validation commands from validation.md
  5. On pass: `updateCapsuleStats(success=true)`; on fail: `updateCapsuleStats(success=false)` + log failure reason
- **Command**: `/alata:evolve apply <capsule-id>`

**Step 3: Commit**

```bash
git add skills/evolution/capsule-apply/
git commit -m "feat: add capsule-apply skill — apply Capsule with confidence tracking"
```

---

## Phase 5: Closing Loop

> Goal: verification-loop, finishing, reviewing. Full workflow end-to-end usable.

---

### Task 5.1: Write verification-loop skill

**Files:**
- Create: `skills/quality/verification-loop/skill.md`

**Step 1: Create directory and write skill**

Sections:
- **Purpose**: verify implementation before claiming completion
- **Hard rule**: never say "done" without running verification commands and showing output
- **Process**:
  1. Read task_plan.md — collect all "verification commands" listed
  2. Run each command, capture output
  3. All pass → proceed to finishing; any fail → fix and re-run
  4. Write verification summary to findings.md (append-only)
- **Integration**: Stop Hook prompts Capsule extract after verification passes

**Step 2: Commit**

```bash
git add skills/quality/verification-loop/
git commit -m "feat: add verification-loop skill — evidence-before-assertions workflow"
```

---

### Task 5.2: Write finishing skill

**Files:**
- Create: `skills/workflow/finishing/skill.md`

**Step 1: Create directory and write skill**

Sections:
- **Purpose**: merge or close a Task Space cleanly
- **Options presented to user**:
  1. Merge to main + clean up Space
  2. Create PR
  3. Keep Space open (defer)
  4. Discard changes (safe — worktree deletion has zero blast radius)
- **Merge process**: git merge → delete worktree → remove from spaces.json → clear current_space
- **PR process**: `gh pr create` with summary from task_plan.md
- **Post-merge**: prompt `/alata:evolve extract` if not already done
- **Command**: `/alata:finish`

**Step 2: Commit**

```bash
git add skills/workflow/finishing/
git commit -m "feat: add finishing skill — merge/PR/keep/discard options with space cleanup"
```

---

### Task 5.3: Write reviewing skill (minimal)

**Files:**
- Create: `skills/workflow/reviewing/skill.md`

**Step 1: Create directory and write skill**

Sections:
- **Purpose**: lightweight code review before merge
- **3 checks only** (YAGNI):
  1. Plan conformance — did we implement what task_plan.md said?
  2. Code quality — obvious bugs, missing error handling at system boundaries
  3. Risk — what could break? any backwards-incompatible changes?
- **Output**: findings appended to findings.md with `[REVIEW]` prefix
- **Pass criteria**: no blocking issues found; reviewer signs off
- **Command**: `/alata:review`

**Step 2: Commit**

```bash
git add skills/workflow/reviewing/
git commit -m "feat: add reviewing skill — minimal 3-check code review"
```

---

## Phase 6: Onboarding + Cross-platform Prep

> Goal: First-run experience, onboarding skill, Codex adapter stub.

---

### Task 6.1: Write onboarding skill

**Files:**
- Create: `skills/meta/onboarding/skill.md`

**Step 1: Create directory and write skill**

Sections:
- **Purpose**: guide new users through first-time setup
- **Trigger**: automatically invoked on first `SessionStart` (detected by init.js `isFirstRun`)
- **Checklist**:
  1. Verify Node.js ≥ 18 installed
  2. Confirm `.alataflow/` initialized (done by session-start hook)
  3. Show a minimal example: `/alata:plan "add hello world endpoint"`
  4. Explain the 4 Hook events and what they do (in user-friendly terms)
  5. Link to full docs
- **Command**: `/alata:onboard` (manual re-run)

**Step 2: Commit**

```bash
git add skills/meta/onboarding/
git commit -m "feat: add onboarding skill — first-run guided setup experience"
```

---

### Task 6.2: Write using-alataflow skill

**Files:**
- Create: `skills/meta/using-alataflow/skill.md`

**Step 1: Create directory and write skill**

Sections:
- **Purpose**: reference guide — all commands, all skills, all files
- **Command index**: complete `/alata:*` command listing with one-line description each
- **File map**: what every file in `.alataflow/` and `.plans/` means
- **Workflow cheatsheet**: brainstorming → planning → executing → verifying → finishing → evolving

**Step 2: Commit**

```bash
git add skills/meta/using-alataflow/
git commit -m "feat: add using-alataflow reference skill — command index and file map"
```

---

### Task 6.3: Codex adapter stub

**Files:**
- Create: `.codex/INSTALL.md`

**Step 1: Write INSTALL.md**

Content:
- Manual installation steps for Codex (since no Hook system)
- Copy `skills/` directory to `.codex/skills/`
- Load `CLAUDE.md` rules manually
- Which commands are available without hooks (planning, memory recall, evolution)
- Which features require Claude Code exclusively (hooks, automatic progress tracking)

**Step 2: Commit**

```bash
git add .codex/
git commit -m "chore: add Codex adapter stub — manual install guide"
```

---

### Task 6.4: Final integration smoke test

**Step 1: Run all tests**

```bash
node --test runtime/*.test.js
```
Expected: All tests pass, 0 failures.

**Step 2: Validate hooks.json**

```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('hooks.json valid')"
```

**Step 3: Validate plugin.json**

```bash
node -e "JSON.parse(require('fs').readFileSync('plugin.json','utf8')); console.log('plugin.json valid')"
```

**Step 4: List all skills**

```bash
find skills/ -name 'skill.md' | sort
```
Expected: 12+ skill files across workflow/, exploration/, context/, evolution/, quality/, coding/, meta/.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: AlataFlow v1.0 — all phases complete, integration smoke test passed"
```

---

## Appendix: File Tree (Final State)

```
AlataFlow/
├── plugin.json
├── CLAUDE.md
├── README.md
├── .gitignore
│
├── hooks/
│   ├── hooks.json
│   ├── session-start.js
│   ├── scrubber.js
│   ├── progress-save.js
│   └── stop-verify.js
│
├── runtime/
│   ├── init.js + test
│   ├── scrubber-rules.js + test
│   ├── memory-loader.js + test
│   ├── memory-writer.js + test
│   ├── memory-search.js + test
│   ├── capsule-decay.js + test
│   ├── progress-writer.js + test
│   ├── space-manager.js + test
│   ├── evolution-manager.js + test
│   └── stop-reporter.js
│
├── skills/
│   ├── workflow/
│   │   ├── brainstorming/skill.md
│   │   ├── planning/skill.md
│   │   ├── task-space/skill.md
│   │   ├── reviewing/skill.md
│   │   └── finishing/skill.md
│   ├── context/
│   │   └── memory-recall/skill.md
│   ├── evolution/
│   │   ├── capsule-extract/skill.md
│   │   └── capsule-apply/skill.md
│   ├── quality/
│   │   └── verification-loop/skill.md
│   └── meta/
│       ├── onboarding/skill.md
│       ├── using-alataflow/skill.md
│       └── writing-skills/skill.md
│
├── .codex/
│   └── INSTALL.md
│
└── doc/
    ├── 2026-02-21-plan-review.md
    ├── 2026-02-21-hook-spec.md
    └── 2026-02-21-implementation-plan.md
```

## Appendix: Test Coverage Targets

| Module | Tests | Key Scenarios |
|--------|-------|---------------|
| init.js | 2 | creates files, idempotent |
| scrubber-rules.js | 5 | each rule + bypass |
| memory-loader.js | 3 | filter, sort, missing file |
| capsule-decay.js | 4 | decays, no decay, floor, skip non-capsule |
| progress-writer.js | 2 | appends, multi-call |
| memory-writer.js | 2 | appends, scrubs |
| memory-search.js | 4 | query, tag, all, case-insensitive |
| space-manager.js | 4 | slug gen, branch naming, length limit |
| evolution-manager.js | 4 | extract creates files, stats success/fail/ceiling |

**Total: 30 tests minimum before v1.0 release.**
