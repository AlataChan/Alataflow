# AlataFlow Installation Guide

本文件只负责两件事：**安装** 和 **验证安装是否成功**。
使用方式、工作流和设计文档入口请看 [README.md](./README.md)。

## 环境要求

- Node.js >= 18
- Git
- Claude Code >= 1.0.0
- 零外部依赖

## Claude Code

### npm 安装（推荐）

```bash
npm i -g alataflow
alataflow setup
```

`alataflow setup` 会自动将插件路径写入 `~/.claude/settings.json`。

如果只想配置当前项目：

```bash
alataflow setup --project
```

验证安装：

```bash
alataflow verify
```

### 从源码安装

如果你 clone 了仓库，也可以手动配置。在 `~/.claude/settings.json`（全局）或项目的 `.claude/settings.json` 中添加：

```json
{
  "plugins": [
    "/path/to/Alataflow"
  ]
}
```

### 安装后做什么

1. 重启 Claude Code
2. 打开目标项目
3. 等待 SessionStart 初始化 `.alataflow/`
4. 运行 `/alata:onboard` 或 `/alata:plan "your task"`

## Codex

Codex 不支持 Claude Code 的 hooks，所以安装目标是：让 `skills/`、`runtime/` 和状态目录可用。

### 初始化

1. 确保仓库中存在 [.codex/AGENTS.md](./.codex/AGENTS.md)
2. 在项目根目录运行：

```bash
node -e "import('./runtime/init.js').then(m => m.initAlataflow('.'))"
```

3. 可选但建议运行测试：

```bash
node --test runtime/*.test.js
```

4. 阅读 [.codex/INSTALL.md](./.codex/INSTALL.md) 了解 Codex 手动模式

## 验证安装

### 通用检查

以下文件应该存在：

```text
.alataflow/memory.jsonl
.alataflow/spaces.json
.alataflow/session_state.json
```

并且测试命令应该可运行：

```bash
node --test runtime/*.test.js
```

### Claude Code 检查

- Claude Code 启动后不应报插件加载错误
- 首次进入项目时应初始化 `.alataflow/`
- 可以正常运行 `/alata:onboard` 或 `/alata:plan "..."`

### Codex 检查

- `.alataflow/` 已初始化
- 你可以读取 [.codex/AGENTS.md](./.codex/AGENTS.md) 并按其中流程工作
- 你理解：Codex 中没有自动 hooks，这是预期行为，不是安装失败

## 常见问题

### Claude Code 没有加载插件

- 检查 `settings.json` 中的插件路径是否为 AlataFlow 仓库绝对路径
- 修改配置后重启 Claude Code

### 没有生成 `.alataflow/`

- 手动运行：

```bash
node -e "import('./runtime/init.js').then(m => m.initAlataflow('.'))"
```

### Codex 没有自动记录进度

这是正常行为。Codex 没有 Claude Code hooks，需按 [.codex/INSTALL.md](./.codex/INSTALL.md) 手动执行等价步骤。

## 下一步

- 总体入口： [README.md](./README.md)
- Codex 手动模式： [.codex/INSTALL.md](./.codex/INSTALL.md)
- Claude / 维护者内部规则： [CLAUDE.md](./CLAUDE.md)
- 设计文档索引： [doc/README.md](./doc/README.md)
