# AlataFlow

Structured AI workflow plugin for Claude Code — planning, memory recall, task isolation, and genetic reuse via Single Spine architecture.

## Features
- 4 thin hooks: session-start, scrubber, progress-save, stop-verify
- JSONL memory: zero dependencies, cross-platform, git-diffable
- Task Space: git worktree abstraction
- GEP-lite: Capsule extract/apply with confidence tracking

## Install
Copy this plugin directory to your Claude Code plugins folder.

## Commands
- /alata:plan <description> — start a new task space
- /alata:recall <query> — search memory
- /alata:remember <note> — save a memory
- /alata:evolve extract — package solution as Capsule
- /alata:finish — merge or close task space
