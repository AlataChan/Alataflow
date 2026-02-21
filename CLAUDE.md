# AlataFlow — Project Rules

## Command Namespace
All commands use /alata:* prefix.

## Single Spine
One source of truth: .alataflow/ for state/memory, .plans/<space-slug>/ for task plans.
Never duplicate state across files. Never write business logic in hooks.

## File Conventions
- .alataflow/memory.jsonl — one JSON object per line, append-only
- .alataflow/spaces.json — JSON array, full rewrite on update
- .alataflow/current_space — plain text, slug only (e.g. auth-feature)
- .alataflow/session_state.json — ephemeral session data
- .plans/<slug>/task_plan.md — implementation steps
- .plans/<slug>/findings.md — discoveries, append-only
- .plans/<slug>/progress.md — tool call log, append-only
- .plans/<slug>/design.md — design decisions

## Runtime Scripts
All business logic in runtime/*.js. Hooks are thin: read stdin, call runtime, write stdout.

## Error Handling
All hooks: on any error, write to .alataflow/error.log and exit 0. Never block the user.
Exception: scrubber (UserPromptSubmit) — exit 2 on confirmed hit.

## Storage
JSONL only. No SQLite. No native addons. Zero compilation required.
