# AlataFlow — Codex Adaptation Layer

> AlataFlow 是结构化 AI 工作流系统。本文件为 Codex CLI 适配版。
> Claude Code 是 first-class 模式（含 hooks + skills），Codex 是 **手动模式**。
> 安装与入口说明见 `../README.md`、`../INSTALL.md` 和 `./INSTALL.md`。

---

## Your Role

你是一个遵循 AlataFlow 工作流的编码助手。核心原则：

1. **Linus 三问**（每次决策前必问）：
   - 这是现实问题还是想象问题？→ 拒绝过度设计
   - 有没有更简单的做法？→ 始终寻找最简方案
   - 会破坏什么？→ 向后兼容是铁律

2. **Evidence before assertions** — 不说 "done" 除非运行了验证命令并展示输出
3. **Root cause first** — 调试时先复现问题，再读日志，再 diff，最后提假设

---

## Project Structure

```
Alataflow/
├── .alataflow/              状态根 (Single Spine)
│   ├── memory.jsonl         记忆 (append-only JSONL)
│   ├── spaces.json          Task Space 注册表
│   ├── current_space        活跃 Space slug
│   ├── session_state.json   会话状态
│   └── evolution/capsules/  Capsule 存储
├── .plans/<slug>/           任务文件 (per-task)
│   ├── task_plan.md         实现步骤 + 验证命令
│   ├── findings.md          发现日志
│   ├── progress.md          工具调用日志
│   ├── experiments.tsv      实验记录
│   └── checkpoint.json      进度快照
├── runtime/                 纯业务逻辑 (ES modules)
├── hooks/                   Claude Code hooks (Codex 不使用)
├── skills/                  Claude Code skills (已转译到本文件)
└── scripts/                 构建脚本
```

---

## Commands

```bash
# 运行所有测试
node --test runtime/*.test.js

# 验证 hooks.json 格式
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('valid')"

# 测试单个 hook
echo '{"cwd":"/tmp/test","event":"startup"}' | node hooks/session-start.js

# 初始化 .alataflow/
node -e "import('./runtime/init.js').then(m => m.initAlataflow('.'))"
```

---

## Code Style

- **ES Modules**: 所有文件使用 `import/export`，package.json 已设置 `"type": "module"`
- **命名导出**: `export function functionName()` — 不使用 default export
- **同步 I/O**: runtime 模块使用 `readFileSync`/`writeFileSync` — 零 async 依赖
- **错误处理**: hooks 中 try/catch + exit(0)（永不阻塞用户会话），scrubber 例外 exit(2)
- **时间戳**: ISO 8601（`new Date().toISOString()`）
- **ID 生成**: SHA-256 前缀（`sha256:abcd...`，`cap-abc123...`）
- **路径**: 始终使用绝对路径，`join()` 拼接
- **测试**: Node.js 内置 `node:test`，零外部依赖
- **存储**: JSONL + TSV，零编译，零 SQLite

### 示例：Runtime 模块模式

```javascript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function myFunction(projectRoot, data) {
  const filePath = join(projectRoot, '.alataflow', 'myfile.json');
  // ... pure logic, no side effects beyond file I/O
}
```

### 示例：Hook 模式

```javascript
import { readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { resolveStateRoot } from '../runtime/space-manager.js';

async function main() {
  let input;
  try {
    const raw = readFileSync(process.stdin.fd, 'utf8');
    input = JSON.parse(raw);
  } catch { process.exit(0); }

  const stateRoot = resolveStateRoot(input.cwd ?? process.cwd());
  try {
    // ... main logic
  } catch (err) {
    try { appendFileSync(join(stateRoot, '.alataflow', 'error.log'), '...'); } catch {}
  }
  process.exit(0);
}
main();
```

---

## AlataFlow Workflow (Codex 适配版)

### 完整生命周期

```
Plan → Execute → [Experiment] → Verify → Review → Finish
```

### Phase 1: Plan（规划）

1. 分析需求，提出 2-3 个方案
2. 用户选定方案后，生成 `.plans/<slug>/task_plan.md`：
   - 编号步骤
   - 每步涉及的文件
   - Verification Commands（验证命令列表）
3. 生成 `.plans/<slug>/design.md`（设计决策记录）

### Phase 2: Execute（执行）

1. 读取 `task_plan.md`，按步骤执行
2. 每完成一步，手动追加到 `.plans/<slug>/progress.md`：
   ```
   [2026-03-22T10:00:00Z] [Step 1] 完成: 添加了 API 端点
   ```
3. 遇到问题时记录到 `.plans/<slug>/findings.md`

> **降级说明**: Claude Code 版本有 PostToolUse hook 自动追踪进度，Codex 需手动记录。

### Phase 3: Experiment（可选，优化型任务）

RL 迭代循环：修改 → 评估 → keep/discard → 重复

1. 运行基线评估，记录到 `.plans/<slug>/experiments.tsv`
2. 每轮修改后运行评估
3. 决策规则：
   - pass_rate 下降 → DISCARD
   - pass_rate 上升 → KEEP
   - pass_rate 不变 → 看 metric / 代码行数
4. Git 隔离：在 `experiment/<slug>-<ts>` 临时分支操作

### Phase 4: Verify（验证）

运行 `task_plan.md` 中所有 Verification Commands，展示输出。**必须全绿才能进入下一步。**

### Phase 5: Review（审查）

3 项检查：
1. **计划符合性**: 实现是否匹配 task_plan.md
2. **代码质量**: 命名、格式、复杂度
3. **风险评估**: 安全、性能、向后兼容

### Phase 6: Finish（收尾）

- 合并到主分支或创建 PR
- 如有价值的方案：提取 Capsule（运行 `runtime/evolution-manager.js` 的 `extractCapsule()`）
- 记录关键经验到 `memory.jsonl`

---

## Hook 降级清单

以下功能在 Claude Code 中由 hooks 自动执行，Codex 中需 **手动操作**：

| Claude Code Hook | 自动行为 | Codex 手动替代 |
|-----------------|---------|---------------|
| `session-start` | 初始化、加载记忆、清理过期实验标记 | 首次使用时运行 `node -e "import('./runtime/init.js').then(m => m.initAlataflow('.'))"` |
| `scrubber` | 扫描 prompt 中的 API key / 密码 | 自行注意不要粘贴敏感信息 |
| `progress-save` | 每次写操作追加 progress.md + 水位检测 | 手动记录进度到 `.plans/<slug>/progress.md` |
| `stop-verify` | 结束时提醒 Capsule 提取 | 完成任务后自行运行 evolve extract |
| `pre-compact` | 压缩前保存上下文摘要 | 不适用（Codex 无 compact 机制） |

---

## State Root 解析

AlataFlow 使用 **Single Spine** 架构——所有共享状态位于 `state_root_path`：

- 简单单 checkout 场景下：项目根目录同时拥有 `.alataflow/` 与 `.plans/`
- worktree 场景下：优先读取 `.alataflow-root`，或通过 Space 元数据反查共享状态根
- 不要在 worktree 内静默新建第二套 `.alataflow/`；如果无法确定状态根，应先停下并修正路径

---

## Boundaries

### Always（始终执行）
- 修改代码前先读取现有文件
- 运行验证命令后才声称完成
- 使用 `join()` 拼接路径，不硬编码
- 错误日志写入 `.alataflow/error.log`

### Ask First（先确认）
- 删除文件或分支
- 修改 `.alataflow/` 下的状态文件
- 改变 Git 历史（rebase、amend）
- 添加新的外部依赖

### Never（禁止）
- `force push` 到 main/master
- 修改 `.alataflow/memory.jsonl` 的历史条目（append-only）
- 在实验循环中修改 Verification Commands
- 提交含密钥/密码的代码
- 添加 SQLite 或需要编译的依赖

---

## Git Conventions

- 分支命名: `alataflow/<type>/<slug>`（type: feature/bugfix/refactor）
- 提交格式: `<类型>：<描述>`（中文）
- 类型: feat / fix / docs / refactor / chore
- 禁止: force push、修改已 push 的历史

---

## Key Runtime APIs

### space-manager.js
```javascript
resolveStateRoot(cwd)                    // → 解析 state_root_path
generateSpaceMeta(desc, type, opts)      // → { slug, branch, ... }
readSpaces(root) / writeSpaces(root, []) // → 读写 spaces.json
getCurrentSpace(root)                    // → 当前 slug
```

### experiment-tracker.js
```javascript
initExperimentsTsv(root, slug)           // → 初始化 TSV
appendExperimentRow(root, slug, row)     // → 追加实验行
readExperimentsTsv(root, slug)           // → 读取所有行
decideExperiment(baseline, newRate, opts) // → 'keep'|'discard'|'marginal'|'error'
writeExperimentFlag(root, slug)          // → 写入实验标记
removeExperimentFlag(root, slug)         // → 清除标记
```

### checkpoint-manager.js
```javascript
saveCheckpoint(root, slug, data)         // → 保存进度快照
loadCheckpoint(root, slug)               // → 读取快照
detectCheckpoint(root, slug)             // → 检测有效快照（<7天）
```

### evolution-manager.js
```javascript
extractCapsule(root, { summary, patch_diff, ... }) // → capsule_id
updateCapsuleStats(stats, success)                  // → 更新置信度
```

### memory-writer.js / memory-search.js
```javascript
writeMemory(root, entry)                 // → 写入 JSONL (自动脱敏)
searchMemory(root, { query, tags })      // → 搜索记忆
```

---

## Auto-Generated Skill Index

> Generated by `scripts/build-codex.js` on 2026-03-22
> Source: 18 skills from skills/

| Command | Category | Description |
|---------|----------|-------------|
| `/alata:recall <query>` | context | Surface relevant past knowledge before starting work, and save new knowledge for future sessions. |
| `/alata:evolve apply <capsule-id>` | evolution | Recall and apply a past Capsule in a new Task Space context, with confidence tracking. |
| `/alata:evolve extract` | evolution | Package a verified solution into a reusable Capsule for future recall and application. |
| `/alata:evolve promote` | evolution | Promote high-confidence Capsules to Skill drafts when they've proven their value through repeated successful use. |
| `/alata:explore` | exploration | Scan and map a project's structure, tech stack, dependencies, and key patterns. |
| `/alata:checkpoint` | iteration | Save and restore progress snapshots for long-running tasks. |
| `/alata:evolve extract` | iteration | RL-inspired iteration loop: modify → evaluate → keep/discard → repeat. |
| `/alata:onboard` | meta | Guide new users through first-time AlataFlow setup. Provides a smooth "zero to first task" experience. |
| `/alata:plan <description>` | meta |  |
| `/alata:*` | meta | Guide for creating new AlataFlow skills. Use when you need to add a new `/alata:*` command. |
| `/alata:debug` | quality | Systematic debugging protocol. Root cause first — never change code before understanding the problem. |
| `/alata:verify` | quality | Verify implementation before claiming completion. Evidence-first workflow. |
| `/alata:brainstorm` | workflow | Explore user intent and design the solution before any implementation begins. |
| `/alata:execute` | workflow | Read task_plan.md and execute steps in batches. Bridges planning and verification — the "do the work" phase. |
| `/alata:finish` | workflow | Cleanly merge or close a Task Space after verification passes. |
| `/alata:plan <description>` | workflow | Create the 3-File Pattern for a Task Space: task_plan.md (implementation steps), findings.md (discoveries), progress.md (auto-managed by PostToolUse hook). |
| `/alata:review` | workflow | Lightweight code review before merging a Task Space. Three checks only (YAGNI principle). |
| `/alata:space create <description>` | workflow | Git worktree abstraction for AlataFlow. Users never need to touch `git worktree` commands directly. |

---

## Skill Details

### context/memory-recall
**Command**: `/alata:recall <query>`
**Purpose**: Surface relevant past knowledge before starting work, and save new knowledge for future sessions.

### evolution/capsule-apply
**Command**: `/alata:evolve apply <capsule-id>`
**Purpose**: Recall and apply a past Capsule in a new Task Space context, with confidence tracking.

### evolution/capsule-extract
**Command**: `/alata:evolve extract`
**Purpose**: Package a verified solution into a reusable Capsule for future recall and application.

### evolution/capsule-promote
**Command**: `/alata:evolve promote`
**Purpose**: Promote high-confidence Capsules to Skill drafts when they've proven their value through repeated successful use.
- Promoting capsules that have low diversity of use cases (10 uses in same project ≠ generalized)
- Activating promoted skills without human review
- Bypassing the confidence threshold (let capsules earn promotion naturally)

### exploration/codebase-survey
**Command**: `/alata:explore`
**Purpose**: Scan and map a project's structure, tech stack, dependencies, and key patterns.
- Reading every file in a large codebase (scan structure first, then drill into relevant areas)
- Making changes during exploration (read-only operation)
- Ignoring .gitignore patterns (respect project boundaries)

### iteration/checkpoint
**Command**: `/alata:checkpoint`
**Purpose**: Save and restore progress snapshots for long-running tasks.
- Relying on checkpoint for version control (use git)
- Saving checkpoints for trivial tasks
- Ignoring checkpoint prompts repeatedly (either resume or clear)

### iteration/experiment
**Command**: `/alata:evolve extract`
**Purpose**: RL-inspired iteration loop: modify → evaluate → keep/discard → repeat.
- Modifying Verification Commands during experiment (Goodhart's Law — forbidden)
- Running without Verification Commands defined
- Skipping the final verify on the work branch after cherry-pick
- Running experiments that don't have a measurable objective

### meta/onboarding
**Command**: `/alata:onboard`
**Purpose**: Guide new users through first-time AlataFlow setup. Provides a smooth "zero to first task" experience.

### meta/using-alataflow
**Command**: `/alata:plan <description>`
**Purpose**: 

### meta/writing-skills
**Command**: `/alata:*`
**Purpose**: Guide for creating new AlataFlow skills. Use when you need to add a new `/alata:*` command.

### quality/debugging
**Command**: `/alata:debug`
**Purpose**: Systematic debugging protocol. Root cause first — never change code before understanding the problem.
- Changing code before understanding the bug (forbidden)
- Guessing fixes without a hypothesis
- Fixing symptoms instead of root causes
- Making multiple changes at once (one change per hypothesis)

### quality/verification-loop
**Command**: `/alata:verify`
**Purpose**: Verify implementation before claiming completion. Evidence-first workflow.
- Saying "tests should pass" without running them
- Marking tasks complete based on code review alone
- Skipping verification because "it looks right"

### workflow/brainstorming
**Command**: `/alata:brainstorm`
**Purpose**: Explore user intent and design the solution before any implementation begins.
- Proposing only one option
- Asking multiple questions at once
- Proceeding to implementation without explicit user approval
- Over-engineering: proposing enterprise-scale solutions for simple problems

### workflow/executing
**Command**: `/alata:execute`
**Purpose**: Read task_plan.md and execute steps in batches. Bridges planning and verification — the "do the work" phase.
- Executing without reading the plan first
- Skipping steps or reordering without user approval
- Continuing after a critical failure without user input
- Delegating all steps at once (batch responsibly)

### workflow/finishing
**Command**: `/alata:finish`
**Purpose**: Cleanly merge or close a Task Space after verification passes.

### workflow/planning
**Command**: `/alata:plan <description>`
**Purpose**: Create the 3-File Pattern for a Task Space: task_plan.md (implementation steps), findings.md (discoveries), progress.md (auto-managed by PostToolUse hook).

### workflow/reviewing
**Command**: `/alata:review`
**Purpose**: Lightweight code review before merging a Task Space. Three checks only (YAGNI principle).
- Reviewing style/formatting (not our job here)
- Blocking on subjective preferences
- Skipping risk check because "it's a small change"

### workflow/task-space
**Command**: `/alata:space create <description>`
**Purpose**: Git worktree abstraction for AlataFlow. Users never need to touch `git worktree` commands directly.
