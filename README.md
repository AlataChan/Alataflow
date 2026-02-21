# AlataFlow

Structured AI workflow plugin for Claude Code — planning, memory recall, task isolation, and genetic reuse via Single Spine architecture.

面向 Claude Code 的结构化 AI 工作流插件——以 Single Spine 架构实现：规划、记忆召回、任务隔离与遗传式复用（GEP-lite）。

## Features / 功能

**EN**
- 4 thin hooks: session-start, scrubber, progress-save, stop-verify
- JSONL memory: zero dependencies, cross-platform, git-diffable
- Task Space: git worktree abstraction
- GEP-lite: Capsule extract/apply with confidence tracking

**中文**
- 4 个薄 Hook：session-start、scrubber、progress-save、stop-verify
- JSONL 记忆层：零依赖、跨平台、适合 git diff
- Task Space：基于 git worktree 的任务隔离抽象
- GEP-lite：Capsule 提取/应用 + 置信度跟踪

## Requirements / 环境要求

**EN**
- Node.js >= 18
- Claude Code >= 1.0.0
- Git (required for Task Space workflows)

**中文**
- Node.js >= 18
- Claude Code >= 1.0.0
- Git（Task Space 工作流需要）

## Install (Claude Code) / 安装（Claude Code）

**EN**
1. Copy this plugin directory into your Claude Code plugins folder.
2. Restart Claude Code.
3. On first SessionStart, AlataFlow initializes `.alataflow/` in your project.

**中文**
1. 将本插件目录复制到 Claude Code 的 plugins 目录。
2. 重启 Claude Code。
3. 首次 SessionStart 时，AlataFlow 会在项目中初始化 `.alataflow/`。

## Quickstart / 快速开始

**EN**
1. Run `/alata:onboard` (optional) to walk through setup.
2. Run `/alata:plan "add a hello world endpoint"` to start your first Task Space and plan.

**中文**
1. 可选：运行 `/alata:onboard` 完成首次引导。
2. 运行 `/alata:plan "add a hello world endpoint"` 创建第一个 Task Space 并生成计划。

## Commands / 命令

| Command | English | 中文 |
|---------|---------|------|
| `/alata:plan <description>` | Brainstorming → task space → planning | 头脑风暴 → 创建任务空间 → 生成计划 |
| `/alata:brainstorm` | Explore intent, propose approaches | 澄清需求并给出方案选项 |
| `/alata:space create <desc>` | Create an isolated Task Space | 创建隔离的 Task Space |
| `/alata:space status` | List spaces and status | 列出所有空间与状态 |
| `/alata:space switch <slug>` | Switch active space | 切换当前空间 |
| `/alata:space clean` | Clean completed/stale spaces | 清理完成/闲置空间 |
| `/alata:recall <query>` | Search memory by keyword | 按关键词检索记忆 |
| `/alata:remember <note>` | Save a memory entry | 写入一条记忆 |
| `/alata:memory status` | Show memory statistics | 查看记忆统计 |
| `/alata:memory sync` | Compact/deduplicate memory.jsonl | 压缩/去重 memory.jsonl |
| `/alata:verify` | Run verification commands from task_plan.md | 执行 task_plan.md 的验证命令 |
| `/alata:review` | 3-check review (plan/quality/risk) | 三项审查（计划/质量/风险） |
| `/alata:finish` | Merge/PR/keep/discard Task Space | 合并/PR/保留/丢弃任务空间 |
| `/alata:evolve extract` | Extract a verified Capsule | 提取已验证的 Capsule |
| `/alata:evolve apply [id]` | Apply a Capsule patch and track outcome | 应用 Capsule 补丁并记录结果 |
| `/alata:onboard` | First-time setup guide | 首次使用引导 |

For the full reference, see `skills/meta/using-alataflow/skill.md`.

完整参考见：`skills/meta/using-alataflow/skill.md`。

## State & Plans / 状态与计划文件

**EN**
- `.alataflow/` is the single source of truth for state/memory.
- `.plans/<slug>/` stores per-task plan, findings, progress and design notes.

**中文**
- `.alataflow/` 是状态与记忆的唯一真实来源（Single Spine）。
- `.plans/<slug>/` 存放每个任务的计划、发现、进度与设计记录。

## Development / 开发

**EN**
Run tests (no external dependencies):
```bash
node --test runtime/*.test.js
```

**中文**
运行测试（无外部依赖）：
```bash
node --test runtime/*.test.js
```

## Codex Note / Codex 说明

**EN**
Codex does not support Claude Code hooks. You can still use `skills/` and run `runtime/` scripts manually.
See `.codex/INSTALL.md`.

**中文**
Codex 不支持 Claude Code 的自动 Hooks，但仍可手动使用 `skills/` 并直接运行 `runtime/` 脚本。
详见：`.codex/INSTALL.md`。
