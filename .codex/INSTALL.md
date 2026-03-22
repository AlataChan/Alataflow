# AlataFlow — Codex Manual Mode

本文件是 **Codex 专用补充说明**。
安装入口请先看上一级的 [INSTALL.md](../INSTALL.md)；这里不重复讲通用安装，只说明 Codex 与 Claude Code 的差异。

## Codex 中能做什么

- 使用 `skills/` 中的工作流技能
- 直接运行 `runtime/` 下的 Node.js 脚本
- 使用 Task Space、Memory、Capsule、Experiment 的同一套概念模型

## Codex 中不会自动发生什么

| Claude Code 自动能力 | Codex 现状 |
|----------------------|------------|
| SessionStart 初始化与记忆加载 | 需要手动初始化和读取 |
| PostToolUse 自动写 `progress.md` | 需要手动记录 |
| UserPromptSubmit scrubber | 需要自己注意不要粘贴敏感信息 |
| Stop Hook 提醒验证/提取 | 需要自己执行 |

## 首次使用

1. 先完成 [../INSTALL.md](../INSTALL.md) 中的 Codex 初始化
2. 阅读 [AGENTS.md](./AGENTS.md)
3. 确保项目根目录存在：

```text
.alataflow/memory.jsonl
.alataflow/spaces.json
.alataflow/session_state.json
```

4. 进入任务前，最好先运行：

```bash
node --test runtime/*.test.js
```

## 手动等价步骤

### 记忆加载

在会话开始前可手动读取项目相关记忆：

```bash
node -e "
const { loadMemoriesForProject } = await import('./runtime/memory-loader.js');
const mems = loadMemoriesForProject(process.cwd(), process.cwd());
console.log(mems.map(m => '- ' + m.summary).join('\n'));
"
```

### 进度记录

Codex 不会自动写 `progress.md`。如果你在一个 Task Space 中工作，需要自行把关键步骤追加到 `.plans/<slug>/progress.md`。

### 验证与收尾

完成实现后，仍应按 AlataFlow 生命周期执行：

```text
Plan → Execute → [Experiment] → Verify → Review → Finish
```

也就是说，在 Codex 里同样要显式完成验证、审查和收尾，只是这些步骤不由 hooks 自动提醒。

## 常用脚本

- `runtime/init.js`：初始化 `.alataflow/`
- `runtime/memory-loader.js`：加载记忆
- `runtime/memory-search.js`：搜索记忆
- `runtime/memory-writer.js`：写入记忆
- `runtime/space-manager.js`：Task Space 管理
- `runtime/progress-writer.js`：进度记录
- `runtime/evolution-manager.js`：Capsule 提取与统计

## 继续阅读

- 总体入口： [../README.md](../README.md)
- 安装说明： [../INSTALL.md](../INSTALL.md)
- Codex 执行约束： [AGENTS.md](./AGENTS.md)
- 设计文档索引： [../doc/README.md](../doc/README.md)
