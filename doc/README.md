# Documentation Guide

`doc/` 用来存放 **设计文档、升级方案、评审记录和实现计划**。
如果你的目标只是开始使用 AlataFlow，不要从这里开始；先看上一级的 `README.md` 和 `INSTALL.md`。

## 推荐阅读顺序

### 普通用户

1. [README.md](../README.md)
2. [INSTALL.md](../INSTALL.md)
3. Claude Code 用户继续看 [CLAUDE.md](../CLAUDE.md)
4. Codex 用户继续看 [../.codex/INSTALL.md](../.codex/INSTALL.md) 和 [../.codex/AGENTS.md](../.codex/AGENTS.md)

### 维护者 / 设计阅读者

1. [doc/alataflow.md](./alataflow.md)
2. [doc/2026-02-21-plan-review.md](./2026-02-21-plan-review.md)
3. [doc/2026-02-21-hook-spec.md](./2026-02-21-hook-spec.md)
4. [doc/2026-02-21-implementation-plan.md](./2026-02-21-implementation-plan.md)
5. [doc/2026-03-22-v1.1-upgrade-plan.md](./2026-03-22-v1.1-upgrade-plan.md)

## 文件说明

| 文件 | 作用 |
|------|------|
| [doc/alataflow.md](./alataflow.md) | 早期收敛设计，解释 Single Spine、Task Space、Memory、GEP-lite 的原始思路 |
| [doc/2026-02-21-plan-review.md](./2026-02-21-plan-review.md) | 对早期方案的审查与问题清单 |
| [doc/2026-02-21-hook-spec.md](./2026-02-21-hook-spec.md) | v1.0 Hook 规格 |
| [doc/2026-02-21-implementation-plan.md](./2026-02-21-implementation-plan.md) | v1.0 分阶段实施计划 |
| [doc/2026-03-22-v1.1-upgrade-plan.md](./2026-03-22-v1.1-upgrade-plan.md) | v1.1 升级方案，重点是 Experiment、Checkpoint、Context、水位与状态根收口 |

## 文档边界

- `README.md`：用户入口
- `INSTALL.md`：安装与验证
- `CLAUDE.md` / `.claude/CLAUDE.md` / `.codex/AGENTS.md`：平台或执行器约束
- `doc/`：设计与历史，不承担 onboarding
