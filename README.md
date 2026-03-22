# AlataFlow

AlataFlow 是一套面向 **Claude Code + Codex** 的结构化 AI 工作流。
它把共享状态收敛到 `.alataflow/`，把任务过程收敛到 `.plans/<slug>/`，让规划、执行、验证、审查和经验复用都有稳定落点。

## 安装

```bash
npm i -g alataflow
alataflow setup
# 重启 Claude Code
```

`alataflow setup` 会自动将插件路径写入 `~/.claude/settings.json`。也可以用 `alataflow setup --project` 只配置当前项目。

安装后运行 `alataflow verify` 确认一切正常。

详细安装说明见 [INSTALL.md](./INSTALL.md)。

## 平台支持

| 平台 | 支持级别 | 使用方式 |
|------|----------|----------|
| Claude Code | First-class | `hooks + skills + runtime`，自动化最完整 |
| Codex | Supported | `skills + runtime` 手动模式，无 Claude hooks |

## 从哪里开始

- 想在 Codex 里使用：看 [.codex/INSTALL.md](./.codex/INSTALL.md) 和 [.codex/AGENTS.md](./.codex/AGENTS.md)
- 想了解项目内部规则：看 [CLAUDE.md](./CLAUDE.md) 和 [.claude/CLAUDE.md](./.claude/CLAUDE.md)
- 想看设计方案、升级路线和评审记录：看 [doc/README.md](./doc/README.md)

## 3 分钟上手

### Claude Code

1. `npm i -g alataflow && alataflow setup`
2. 重启 Claude Code，打开目标项目，等待 SessionStart 初始化 `.alataflow/`
3. 运行 `/alata:onboard` 或 `/alata:plan "your task"`
4. 按流程完成：`/alata:verify` → `/alata:review` → `/alata:finish`

### Codex

1. 按 [INSTALL.md](./INSTALL.md) 完成 Codex 侧初始化
2. 运行：
   ```bash
   node -e "import('./runtime/init.js').then(m => m.initAlataflow('.'))"
   ```
3. 阅读 [.codex/AGENTS.md](./.codex/AGENTS.md)
4. 采用同一生命周期手动推进任务；hooks 不会自动触发

## 核心工作流

```text
Plan → Execute → [Experiment] → Verify → Review → Finish
```

- `Experiment` 是可选环节，适合性能调优、重构、迭代修复
- Claude Code 会自动接入 hooks
- Codex 需要手动执行等价步骤

## 核心概念

- **Single Spine**：共享状态放在 `.alataflow/`，任务过程放在 `.plans/<slug>/`
- **Task Space**：以独立任务空间承载单个任务的计划、进度、发现和验证
- **Memory / Capsule**：把经验和已验证方案沉淀为可检索、可复用资产

## 常用命令

| 命令 | 用途 |
|------|------|
| `/alata:onboard` | 首次使用引导 |
| `/alata:plan <description>` | 从需求澄清进入 Task Space 和任务计划 |
| `/alata:verify` | 运行 `task_plan.md` 中定义的验证命令 |
| `/alata:review` | 做计划符合性、代码质量、风险审查 |
| `/alata:finish` | 完成收尾：合并、保留或丢弃 Task Space |
| `/alata:recall <query>` | 检索历史记忆 |
| `/alata:remember <note>` | 写入一条记忆 |
| `/alata:evolve extract` | 将通过验证的方案提取为 Capsule |
| `/alata:experiment ...` | 进行 keep/discard 式迭代实验 |

完整命令参考见 [skills/meta/using-alataflow/skill.md](./skills/meta/using-alataflow/skill.md)。

## 目录结构

| 路径 | 作用 |
|------|------|
| `.alataflow/` | 共享状态根：记忆、空间注册表、会话状态、错误日志 |
| `.plans/<slug>/` | 单任务文件：`task_plan.md`、`findings.md`、`progress.md`、`design.md` |
| `skills/` | 工作流技能定义 |
| `runtime/` | Node.js 业务逻辑 |
| `hooks/` | Claude Code hooks |
| `doc/` | 设计文档、升级方案、历史评审 |

## 开发

运行测试：

```bash
node --test runtime/*.test.js
```

如果你是第一次读这个仓库，建议顺序是：

1. [README.md](./README.md)
2. [INSTALL.md](./INSTALL.md)
3. Claude Code 用户继续看 [CLAUDE.md](./CLAUDE.md)
4. Codex 用户继续看 [.codex/INSTALL.md](./.codex/INSTALL.md) 和 [.codex/AGENTS.md](./.codex/AGENTS.md)
5. 维护者再进入 [doc/README.md](./doc/README.md)
