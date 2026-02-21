# AlataFlow v1.2 方案审查报告

**日期**：2026-02-21
**审查对象**：alataflow.md（收敛方案 v1.2）
**背景**：现阶段小团队使用，未来目标公开发布至 Claude Code Plugin Marketplace；质量优先，时间不设硬约束。

---

## 一、整体合理性

架构自洽。Single Spine 原则、Core 4 组件边界、3-File Pattern、三层记忆架构、GEP-lite 遗传层之间无根本性矛盾。

**核心风险**：方案的"想法密度"远超"实现密度"——Phase 0-8 时间规划与质量要求严重不匹配，需要重写时间表（见第三节）。

---

## 二、问题与遗漏清单

### 🔴 严重问题（会阻塞交付）

**P1：时间表与质量要求冲突**

原方案 Day 3 要完成 Task Space（worktree 封装 + 自动命名 + 状态感知 + 自动清理 + 失败回滚），Day 4-5 完成三层记忆 + SQLite + GEP-lite MVP。每块单独都是独立项目，压缩在 2-3 天里必然导致质量下降。

**决议**：时间表按质量优先重写，Task Space 和记忆层各自独立为一个 Phase。

**P2：Hook 设计描述过于模糊**

原方案只说"仅 3 个薄 Hook（Pre / Post / Stop）"，未定义触发时机、读写文件、调用脚本、失败处理。Hook 是 Single Spine 的神经系统，模糊会导致实现阶段大量返工。

**决议**：正式 Hook 规格文档见 [2026-02-21-hook-spec.md](./2026-02-21-hook-spec.md)。

**P3：SQLite 跨平台依赖风险**

`better-sqlite3` 需要在目标机器编译 C++ 原生模块，在 Plugin Marketplace 分发场景下，不同平台预编译二进制管理复杂，用户环境不一定有编译工具链，Claude Code 插件沙箱对原生模块支持程度未知。

**决议**：v1.0 改用 JSONL，预留 `storage_backend` 接口，v1.1 可无缝切换 SQLite 或 MCP。JSONL 对 v1.0 规模（记忆召回、FTS 用 `rg` 正则）完全够用，且人类可读、零依赖、`git diff` 可审计变更。

---

### 🟡 重要遗漏（影响体验，不阻塞 v1.0）

**L1：冷启动体验未设计**

原方案用户旅程示例默认已有记忆，未定义：首次安装初始化流程、无记忆时 SessionStart 行为、记忆加载失败降级策略。对公开插件的用户留存至关重要。

**决议**：在 SessionStart Hook 中处理首次安装初始化（见 Hook 规格文档）。

**L2：`.plans/` 目录与主仓库 git 关系未定义**

Task Space 用 worktree 隔离代码，但 `.plans/<space-slug>/` 存在哪个分支未说明。存在 worktree 分支会在 merge 时污染 main。

**决议**：`.plans/` 目录存在 main 分支（不跟随 worktree 分支），通过 `.gitignore` 或专用 `plans` 孤立分支（orphan branch）管理。具体决策在 Task Space Phase 设计时确定。

**L3：多 Agent 并发写入竞争条件**

v1.0 的 3-File Pattern 是纯文件，无锁机制。subagent 并发写入同一 `findings.md` 会出现覆盖。

**决议**：v1.0 以 append-only 写入为约定（每次写一行，不覆盖全文），v1.1 引入文件锁或分文件策略。

**L4：`/alata:evolve extract` 触发时机不明确**

原方案"可提示"语义模糊，导致遗传层实际使用频率不可预期。

**决议**：由 Stop Hook 在检测到本轮有写操作时，在 `additionalContext` 中提示用户（不自动执行，不每次打扰——仅有活跃 Task Space 且有写操作时才提示）。

---

### 🟢 补充建议（锦上添花）

**B1：增加 `onboarding` skill**

面向公开插件，需引导新用户完成首次设置：检查环境、初始化目录、运行 self-check、展示第一个示例任务。比 README 有效 10 倍。

**B2：scrubber 实现优先级提前**

原方案 scrubber 列为 runtime 一部分，但未在任何 Phase 安排实现。对公开插件是合规红线，应在 Phase 1 实现基础版本。

**决议**：scrubber 挂在 UserPromptSubmit Hook，Phase 1 随 Hook 系统一起实现（见 Hook 规格文档）。

**B3：GEP-lite 月衰减机制说明**

Claude Code 插件无持久后台进程，月衰减只能在 SessionStart 时触发（懒惰计算）。需在设计里明确，避免实现时困惑。

**决议**：在 SessionStart Hook 中，对超过 30 天未使用的 Capsule 执行 `confidence × 0.95` 衰减（懒惰计算，读写 memory.jsonl）。

---

## 三、综合评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构合理性 | 8/10 | Single Spine 自洽，边界清晰 |
| 实现可行性 | 5/10 | 时间表与质量要求冲突，Hook 细节缺失 |
| 遗漏完整性 | 6/10 | 冷启动、git 关系、并发写入是明显盲点 |
| 公开发布就绪度 | 4/10 | scrubber 优先级错误，onboarding 缺失 |

---

## 四、已决策事项汇总

| 决策点 | 原方案 | 最终决定 |
|--------|--------|---------|
| L1 存储 | SQLite FTS5 | JSONL（零依赖，跨平台，v1.1 可迁移） |
| Hook 数量 | 3 个（模糊） | 4 个（精确规格，见 hook-spec.md） |
| scrubber 时机 | runtime 某处 | UserPromptSubmit Hook，Phase 1 实现 |
| 冷启动处理 | 未设计 | SessionStart Hook 处理首次安装初始化 |
| GEP-lite 月衰减 | 未说明触发机制 | SessionStart 懒惰计算 |
| `.plans/` git 归属 | 未定义 | Task Space Phase 设计时确定 |
| 时间表 | Day 1-8 硬排期 | 质量优先，重写为按 Phase 交付，不设天数 |
