AlataFlow — 收敛方案 v1.2（选择 1：以 Superpowers 为骨架 + GEP-lite 遗传层）
一、决策确认清单（收敛后）
决策点	最终决定
工作流真源（Single Spine）	✅ 只保留一套：命令/Hook/文件约定（其余只借鉴，不并排启用）
TDD	✅ 可选 Skill，不强制
Task Space（Git Worktree）	✅ 保留，但做“无感化封装 + 可观测 + 可清理”
计划持久化（3-File Pattern）	✅ 每个 Task Space 固定产物：task_plan.md / findings.md / progress.md
记忆系统（Memory v2，先轻后强）	✅ L0 文件；L1 本地可索引（SQLite FTS/JSONL，Capsule schema，无向量）；L2 可选 mcp-memory-service
遗传层（GEP-lite）	✅ 本地 Gene+Capsule（含 patch/diff）+ confidence/streak 自然选择 + 手动晋升 Skill
Runtime（跨平台脚本）	✅ Node.js scripts（确定性逻辑可测试；Hooks 只做薄桥接）
技能表达	✅ Skills 用 Markdown；脚本用 Node.js；业务代码随项目语言（Python/TS/Go…）
插件名	✅ AlataFlow
跨平台	✅ Claude Code (主) + Codex (必须) + Gemini (可选)
二、核心设计深潜（Single Spine）
🧭 Single Spine — 防止“叠插件打架”
目标：借鉴 Superpowers / Everything Claude Code / planning-with-files / OpenViking / mcp-memory-service 的设计思路与骨架，但最终只落地一条“主脊柱”，保证一致性与可维护性。

唯一真源（必须统一）：
- 命令命名空间：`/alata:*`（可提供 `/plan` 等 alias，但底层实现仍是 `/alata:*`）
- Hooks：仅 3 个薄 Hook（Pre / Post / Stop），只负责读写文件 + 调用 runtime，不在 hook 里写业务逻辑
- 文件约定：
  - `.alataflow/`：状态与记忆（project-local）
  - `.plans/<space-slug>/`：每个 Task Space 的计划与过程（3-File Pattern + design）
- 当前空间状态：`.alataflow/spaces.json`（清单）+ `.alataflow/current_space`（指针，可选）

Core 4 组件（边界清晰）：
1) Skills（Markdown）：描述流程、产物、验收标准（“怎么做”与“做到什么程度”）
2) Runtime（Node scripts）：确定性逻辑（创建/切换空间、初始化 3 文件、更新状态、汇总报告、环境自检、隐私清洗）
3) Hooks（Claude Code 专属）：把事件映射到 runtime（薄层，不承载业务复杂度）
4) Adapters：Claude Code 插件包 / Codex 手动安装 / Gemini 镜像目录（同一套 Skills+Runtime）

借鉴来源（只取骨架，不照抄）：
- Superpowers：强流程（设计审批 → 计划 → 执行 → 验证 → 收尾/合并）
- planning-with-files：3-File Pattern + 注意力闭环（关键状态落盘，降低上下文漂移）
- Everything Claude Code：并发探索/持续学习/安装体验的方法论（v1.0 先不做全家桶）
- OpenViking：L0/L1/L2 分层与“文件系统范式”的灵感（后续逐步引入）
- mcp-memory-service：可选外部记忆后端（向量/混合检索/知识图谱尽量外包给成熟实现）

🧠 Planning 策略多态（repair / optimize / innovate）
目标：同一个 `/alata:plan`，根据任务性质自动调整“记忆/胶囊检索 → 规划深度 → 验证强度 → 风险控制”。

- 🔧 repair（存亡优先）：优先检索已验证 Capsule；最小 blast radius；必须回归测试；失败可整空间丢弃
- ⚡ optimize（能效优先）：必须建立基线（benchmark/指标）；变更后量化对比；鼓励 A/B Task Space
- 🚀 innovate（机会驱动）：完整 brainstorming；更重探索与拆解；允许更大变更，但强制收敛验收标准

🌳 Task Space（Git Worktree）— 从“难用”到“无感”
痛点分析（为什么 Superpowers 的 worktree 难用）：

用户需要理解 worktree 概念
分支命名靠 agent 随意生成
不知道自己在哪个 worktree 里
任务完成后忘记清理，worktree 堆积
worktree 间的上下文切换是断裂的
AlataFlow 的解决方案 —— "Task Space" 抽象层：

把 git worktree 包装成 Task Space（任务空间） 概念，用户完全不需要理解底层 git worktree 机制。

用户体验：
  /plan "添加用户认证"
  ↓
  Agent: "我为这个任务创建了独立的工作空间 [auth-feature]。
         所有修改都在隔离环境中，不影响主分支。"
  ↓
  （用户正常工作，完全无感）
  ↓
  任务完成
  ↓
  Agent: "任务完成！工作空间 [auth-feature] 的变更：
         - 新增 3 个文件
         - 修改 2 个文件
         - 所有测试通过

         选择操作：
         [1] 合并到主分支并清理（推荐）
         [2] 创建 PR
         [3] 保留工作空间（稍后处理）
         [4] 放弃变更"
具体改进设计：

TaskSpace Skill (替代 using-git-worktrees):
1. 自动命名规则：
   branch: alataflow/<type>/<slug>
   例：alataflow/feature/user-auth
       alataflow/bugfix/login-redirect
       alataflow/explore/codebase-analysis
2. 状态文件（唯一真源）：
   - `.alataflow/spaces.json`：记录空间清单（slug、branch、worktree_path、plan_dir、last_active、状态）
   - `.alataflow/current_space`：当前空间指针（可选，便于 hooks/脚本快速定位）
3. 计划目录绑定空间（避免多任务互相污染）：
   - `.plans/<space-slug>/design.md`
   - `.plans/<space-slug>/task_plan.md`
   - `.plans/<space-slug>/findings.md`
   - `.plans/<space-slug>/progress.md`

4. 透明切换：
   - Skill 内部处理 worktree 创建/切换
   - 自动 cd 到 worktree 目录
   - 在 progress.md 中记录当前 worktree 路径
   - 所有 subagent 自动继承 worktree 路径
5. 状态感知：
   `/alata:space status`  →  显示所有活跃 Task Space（来自 spaces.json + git status）
   ┌──────────────────────────────────────────┐
   │ 📦 Active Task Spaces                    │
   ├──────────────────────────────────────────┤
   │ ● auth-feature   (3 files changed)  2h  │
   │ ○ fix-login      (1 file changed)   30m │
   │ ○ explore-api    (read-only)        15m │
   └──────────────────────────────────────────┘
6. 自动清理：
   - 任务标记完成 → 自动提示清理选项
   - 空闲超过 24h 的 worktree → Session Start 时提醒
   - `/alata:space clean` → 一键清理所有已完成的空间
7. 失败回滚安全网：
   - 创建 worktree 前自动 stash 当前变更
   - 任务失败 → 可以安全丢弃整个 worktree，零副作用
   - 这才是 worktree 最大的价值：失败成本为零
💾 记忆与上下文 — 先轻后强（避免自研向量栈拖垮交付）
三层记忆架构（收敛版）：

┌─────────────────────────────────────────────────────────────────┐
│                     AlataFlow Memory System                      │
├─────────────────┬────────────────────┬──────────────────────────┤
│   Layer 0       │   Layer 1          │   Layer 2                │
│   Session RAM   │   Local Indexed    │   External MCP           │
│   (最快/易失)    │   (快/持久)         │   (完整/同步)             │
├─────────────────┼────────────────────┼──────────────────────────┤
│                 │                    │                          │
│ .memory/        │ .alataflow/        │ mcp-memory-service       │
│  active_context │  memory.sqlite     │  (外部，可选)             │
│  .md            │                    │                          │
│                 │  evolution/        │                          │
│                 │ 存储：              │ 存储：                    │
│ 用途：           │ - 项目架构决策      │ - 跨项目知识              │
│ - 当前任务状态  │ - 错误教训          │ - 长期模式/偏好            │
│ - 临时发现      │ - 代码模式          │ - 团队共享知识             │
│ - Agent 协调    │ - 依赖关系笔记      │ - 知识图谱                │
│                 │ - 用户偏好          │                          │
│ 生命周期：      │                    │                          │
│ 会话结束即清理  │ 生命周期：           │ 生命周期：                │
│ (摘要→Layer1)   │ 跟随项目           │ 永久                     │
│                 │                    │                          │
│ 延迟：~0ms      │ 延迟：<5ms         │ 延迟：<50ms              │
└─────────────────┴────────────────────┴──────────────────────────┘
阈值同步机制：

```js
// 同步触发条件（满足任一即触发）
const SYNC_THRESHOLDS = {
  memoryCount: 50,        // 本地积累超过 50 条记忆
  daysSinceLastSync: 7,   // 超过 7 天未同步
  importanceScore: 0.8,   // 单条记忆重要性 > 0.8 → 立即同步
  manualTrigger: true,    // /alata:memory sync 手动触发
};
```
// 同步流程
┌──────────────┐     达到阈值     ┌──────────────┐
│   Layer 1    │ ──────────────→ │   Layer 2    │
│  本地 SQLite  │                 │  MCP Memory  │
│              │ ←────────────── │              │
└──────────────┘    启动时拉取     └──────────────┘
// 同步策略
1. 上行同步（L1 → L2）：
   - 批量上传，不阻塞当前工作
   - 按重要性排序，重要的优先
   - 去重：content hash 比对
   - 打标签：自动标记项目名 + 记忆类型
2. 下行同步（L2 → L1）：
   - 仅在 Session Start 时触发
   - 只拉取与当前项目相关的记忆
   - 通过语义搜索匹配，不全量拉取
3. 冲突处理：
   - L1 和 L2 都有同一条记忆的更新 → 保留更新时间最新的
   - 用户可以 `/alata:memory resolve` 手动处理

Layer 1（v1.0）实现策略：先可索引，再语义化
- v1.0：不做本地 embedding/向量检索，避免跨平台依赖、体积与冷启动问题
- L1 目标：可靠、可迁移、可审计（文本为主），足以支撑 recall 与“减少重复解释”
- 语义化（向量/混合检索/知识图谱）：优先接入 L2（mcp-memory-service）来承载

技术选型：
- SQLite（FTS5）或 JSONL（可用 rg/grep 直接检索）
- 摘要：可由模型生成（写入 summary 字段），但不依赖本地 embedding
- 标签：强制 tags（project/type/area/agent/task-space 等），便于过滤与同步
- Capsule patch：统一用可 `git apply` 的 `patch.diff`（不写进 SQLite，SQLite 只存 patch_path）
数据结构：
┌──────────────────────────────────────────────┐
│ assets (SQLite + FTS5)                        │
├──────────────────────────────────────────────┤
│ asset_id       TEXT PRIMARY KEY (sha256:...)  │
│ kind           TEXT (memory|gene|capsule)     │
│ summary        TEXT                           │
│ content        TEXT                           │
│ tags           TEXT (JSON)                    │
│ trigger_signals TEXT (JSON)                   │
│ mutation_type  TEXT (repair|optimize|innovate)│
│ confidence     REAL (0-1)                     │
│ success_streak INTEGER                        │
│ validation     TEXT (unverified|verified|failed)│
│ blast_radius   TEXT (JSON)                    │
│ env_fingerprint TEXT (JSON)                   │
│ patch_path     TEXT (nullable)                │
│ origin         TEXT (JSON)                    │
│ use_count      INTEGER                        │
│ last_used_at   DATETIME                       │
│ created_at     DATETIME                       │
│ updated_at     DATETIME                       │
│ synced_at      DATETIME (nullable)            │
└──────────────────────────────────────────────┘
存储位置：
- 项目级：.alataflow/memory.sqlite
- 用户级：~/.alataflow/global_memory.sqlite
- 遗传资产（Gene/Capsule）：.alataflow/evolution/（或用户级 ~/.alataflow/evolution/）

安全红线（必须）：
- 永不写入：API key / token / 私钥 / 密码 / 个人身份信息
- 记忆写入统一走 runtime 的 scrubber（正则 + 高熵检测 + 允许名单标签）

🧬 遗传层（GEP-lite）— 让“经验”进化为可复用资产
定位：本地优先（个人使用），把“验证通过的解决方案”沉淀成可审计、可继承、可回放的资产（Gene + Capsule）。

核心对象（最小集）：
- Gene（策略模板）：适用前置条件/约束/验证命令/回滚方案/触发信号（trigger_signals）
- Capsule（验证产物）：引用 gene_id + `patch.diff` + ValidationReport + env_fingerprint + blast_radius + 置信度指标
- EvolutionEvent（可选）：审计记录（把 progress/验证链路结构化，便于回放）

本地资产包结构（建议）：
- `.alataflow/evolution/genes/<gene_id>.json`
- `.alataflow/evolution/capsules/<capsule_id>/capsule.json`
- `.alataflow/evolution/capsules/<capsule_id>/patch.diff`（可 `git apply`）
- `.alataflow/evolution/capsules/<capsule_id>/validation.md`（跑了哪些命令、结果是什么）
- `.alataflow/evolution/capsules/<capsule_id>/event.json`（可选）

工作流集成点（不破坏 Single Spine）：
1) `/alata:plan`（repair/optimize）优先 `recall` 命中 Capsule → 在新 Task Space 里 `/alata:evolve apply` → 跑验证
2) `verification-loop` 通过后，`stop-verify` 可提示 `/alata:evolve extract`：把本次变更封装为 Gene+Capsule（含 patch.diff）
3) 每次复用会更新自然选择字段：`confidence / success_streak / use_count / last_used_at`（失败则降权并记录原因）

自然选择（个人版默认规则，可调）：
- 成功复用：confidence +0.05（上限 0.95），success_streak +1
- 复用失败：confidence -0.10（下限 0.10），success_streak 归零，并写入失败信号/环境差异
- 长期未用：按月衰减 confidence（例如 ×0.95/月），避免陈旧方案占前排

晋升路径（先人工确认，后续再自动化）：
- Memory（unverified）→ 多次成功复用 → Capsule（verified，含 patch + 验证链路）
- Capsule 达到阈值（例如 confidence≥0.9 且 use_count≥10）→ 生成 `SKILL.md` 草稿（人工审阅后纳入 skills）
🎯 Skill 精选清单
只保留与 AI/LLM 开发强相关的：

skills/
├── workflow/                          # 核心工作流（必须）
│   ├── brainstorming/                 # 需求梳理
│   ├── planning/                      # 文件化规划（融合版）
│   ├── task-space/                    # Git Worktree 封装
│   ├── executing/                     # 计划执行（支持并发）
│   ├── subagent-driven-dev/           # Subagent 驱动开发
│   ├── reviewing/                     # 代码审查
│   └── finishing/                     # 完成与合并
│
├── exploration/                       # 代码库探索（必须）
│   ├── codebase-survey/               # 代码库扫描（v1.0 单 agent；v1.1 再并发）
│   ├── dependency-map/                # 依赖关系分析
│   └── architecture-review/           # 架构审查
│
├── context/                           # 上下文管理（必须）
│   ├── context-checkpoint/            # 检查点保存
│   ├── strategic-compact/             # 智能压缩建议
│   ├── memory-recall/                 # 记忆召回
│   └── tiered-loading/                # 分层加载
│
├── evolution/                         # 遗传层（GEP-lite，本地优先）
│   ├── capsule-extract/               # 生成 Gene+Capsule（含 patch.diff）
│   ├── capsule-apply/                 # 应用 Capsule 并更新置信度
│   └── promotion/                     # Memory→Capsule→Skill（人工确认）
│
├── quality/                           # 质量保证（可选）
│   ├── tdd-workflow/                  # TDD ← 可选
│   ├── systematic-debugging/          # 系统化调试
│   └── verification-loop/             # 验证循环
│
├── coding/                            # 语言技能（按需启用）
│   ├── python-patterns/               # Python 最佳实践
│   ├── python-testing/                # pytest 等
│   ├── typescript-patterns/           # TS/JS 最佳实践
│   ├── frontend-patterns/             # React/Next.js
│   ├── backend-patterns/              # API/数据库模式
│   └── golang-patterns/               # Go 模式（轻量）
│
└── meta/                              # 元技能（必须）
    ├── using-alataflow/               # 使用指南
    ├── writing-skills/                # 创建新 Skill
    └── continuous-learning/           # 持续学习
总计约 28 个 Skill（含 evolution 3 个），对比 ECC 的 60+ 和 Superpowers 的 15，是一个平衡点。

三、跨平台策略
┌──────────────────────────────────────────────────────────┐
│                    AlataFlow Core                         │
│  (Skills + Rules + Templates + Memory Engine)             │
├────────────────┬────────────────┬────────────────────────┤
│  Claude Code   │    Codex       │    Gemini (可选)        │
│  Adapter       │    Adapter     │    Adapter              │
├────────────────┼────────────────┼────────────────────────┤
│ Plugin 体系    │ .codex/ 目录   │ .gemini/ 目录           │
│ hooks.json     │ INSTALL.md     │ skills/ 镜像            │
│ commands/      │ 指令式安装      │ 无 Hook 支持            │
│ agents/        │                │                        │
│ 完整功能       │ 核心功能        │ 基础功能               │
└────────────────┴────────────────┴────────────────────────┘
跨平台兼容策略：
1. Skills 核心用 Markdown 编写 → 天然跨平台
2. Scripts 用 Node.js → CC/Codex 都能跑
3. Hooks 是 CC 专属特性 → Codex 通过 INSTALL.md 指令替代
4. 命令默认带命名空间（避免与其它插件冲突）：`/alata:*`，可按需提供别名
5. 目录结构自动生成：
   make build-cc    → 生成 Claude Code 插件包
   make build-codex → 生成 .codex/ 目录
   make build-gemini → 生成 .gemini/ 目录
四、修订后的实施路径
v1.0 优先级：先把“可靠闭环”做穿，再加并发与语义记忆（v1.1）

Phase 0: 骨架（Day 1）
├── 初始化项目仓库 + plugin.json
├── 目录结构 + README.md
├── CLAUDE.md（项目级规则）
└── 移植 Superpowers 核心 skill: brainstorming, writing-skills
Phase 1: Single Spine + 规划系统（Day 2）
├── planning skill（融合版，3-File Pattern，绑定 Task Space）
├── Hooks（仅 3 个薄 Hook）：pre-plan-check / post-action-save / stop-verify
├── 模板文件
└── `/alata:plan`（可选 alias `/plan`）
Phase 2: Task Space（Day 3）
├── task-space skill（worktree 封装）
├── `/alata:space` 命令（create/status/clean）
├── 自动命名 + 自动清理
└── 与 planning 集成
Phase 3: 记忆 + 遗传层 MVP（Day 4-5）
├── Layer 0: .memory/ 文件管理
├── Layer 1: SQLite FTS/JSONL（Capsule schema，无向量）
├── 检索管道：trigger_signals 命中 → FTS 回退 →（可选）L2 语义
├── `/alata:recall` / `/alata:remember` / `/alata:memory status`
├── `/alata:evolve extract`：从验证通过的变更生成 Gene+Capsule（含 patch.diff）
├── confidence/streak/use_count 动态更新 + 衰减
└── 阈值同步逻辑（为 L2 预留接口，但不阻塞 v1.0）
Phase 4: 完成闭环（Day 6）
├── verification-loop + finishing（合并/PR/保留/丢弃 + 清理空间）
└── reviewing（最小可用：计划符合性 + 代码质量 + 风险提示）
Phase 5: 跨平台 + 发布（Day 7-8）
├── Codex adapter（.codex/ INSTALL.md）
├── Gemini adapter（可选）
├── Plugin Marketplace 发布
├── 文档完善
└── 示例项目 demo

v1.1（Day 9-12，可选增强）：
- 接入 mcp-memory-service（作为 L2，承载向量/混合检索/知识图谱）
- L0/L1/L2 分层加载 + strategic-compact（注意力压缩）
- /explore 并发扫描（多 subagent 汇总写入 findings）
- /execute 的 subagent-driven-dev（并发执行 + 两阶段 review）
- 团队化：把 `.alataflow/evolution/` 以 GitHub 仓库分发（类似 superpowers 的模式），以签名/版本号做治理
五、一个具体的用户旅程示例
$ claude
[AlataFlow] Session started.
[Memory/L1] Loaded 3 relevant memories for project "my-ai-app":
  - "API 使用 FastAPI + Pydantic v2"
  - "前端用 Next.js 14 App Router"
  - "上次数据库迁移出过 encoding 问题，要注意 UTF-8"
You: 给应用添加用户认证功能
[AlataFlow/Brainstorming] 🧠 让我先理解需求...
  Q1: 认证方式？(OAuth/JWT/Session)
  Q2: 需要哪些第三方登录？
  Q3: 是否需要 RBAC？
You: OAuth2 + JWT, Google 和 GitHub 登录, 简单的 admin/user 两级权限就行
[AlataFlow/Brainstorming] 设计方案已保存 → .plans/auth-feature/design.md
  请确认：[1] 赞同 [2] 需要调整
You: 1
[AlataFlow/TaskSpace] 🔨 创建工作空间 [auth-feature]...
  ✅ 分支: alataflow/feature/auth-feature
  ✅ 工作目录已隔离
[AlataFlow/Planning] 📋 生成实施计划...
  → .plans/auth-feature/task_plan.md (7 tasks, ~25 min)
  → .plans/auth-feature/findings.md (initialized)
  → .plans/auth-feature/progress.md (initialized)
[AlataFlow/Executing] 🚀 开始执行...
  Task 1/7: 安装依赖 (python-jose, passlib, httpx)
  Task 2/7: 创建 auth/models.py ...
  ...

  [Memory] 🧠 发现重要模式：FastAPI OAuth2 需要特别处理
           CORS for callback URLs → 已存储到本地记忆
  Task 7/7: 集成测试 ✅
[AlataFlow/Finishing] 🎉 所有任务完成！
  工作空间 [auth-feature]：
  - 新增: 5 files | 修改: 3 files
  - 测试: 12 passed, 0 failed

  [1] 合并到 main 并清理 ✅
  [2] 创建 PR
  [3] 保留工作空间
You: 1
[AlataFlow] ✅ 已合并到 main, 工作空间已清理
[Evolution] 🧬 已生成 Capsule（含 patch.diff + 验证报告），并注册到本地 evolution registry
[Memory] 📊 本地记忆数: 47/50 (接近同步阈值)
         下次同步将在 3 条记忆后自动触发
