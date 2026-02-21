# Using AlataFlow — Reference Guide

## Command Index

| Command | Description |
|---------|-------------|
| `/alata:plan <description>` | Full flow: brainstorming → task space → planning |
| `/alata:brainstorm` | Explore requirements, propose approaches |
| `/alata:space create <desc>` | Create isolated Task Space (git worktree) |
| `/alata:space status` | List all spaces with status |
| `/alata:space switch <slug>` | Switch active space |
| `/alata:space clean` | Remove completed/stale spaces |
| `/alata:recall <query>` | Search memory by keyword |
| `/alata:remember <note>` | Save a memory entry |
| `/alata:memory status` | Show memory count and sync status |
| `/alata:memory sync` | Compact and deduplicate memory.jsonl |
| `/alata:verify` | Run verification commands from task_plan.md |
| `/alata:review` | 3-check code review (conformance, quality, risk) |
| `/alata:finish` | Merge/PR/keep/discard Task Space |
| `/alata:evolve extract` | Package solution as Capsule |
| `/alata:evolve apply [id]` | Apply past Capsule to current Space |
| `/alata:onboard` | Run first-time setup guide |

## File Map

### .alataflow/ (project-local state)
| File | Purpose |
|------|---------|
| `memory.jsonl` | All memories — append-only JSONL |
| `spaces.json` | Task Space registry — full rewrite on update |
| `current_space` | Active space slug — plain text |
| `session_state.json` | Ephemeral: started_at, write_count |
| `error.log` | Hook errors (auto-created) |
| `scrubber.log` | Privacy guard hits (timestamps only) |
| `evolution/capsules/<id>/` | Extracted Capsules |

### .plans/<slug>/ (per-task files)
| File | Purpose |
|------|---------|
| `task_plan.md` | Implementation steps + verification commands |
| `findings.md` | Append-only discovery log |
| `progress.md` | Auto-logged tool calls (managed by hook) |
| `design.md` | Design decisions from brainstorming |

## Workflow Cheatsheet
```
1. Brainstorm  →  /alata:plan "description"
2. Implement   →  follow task_plan.md steps
3. Verify      →  /alata:verify (run all verification commands)
4. Review      →  /alata:review (3-check)
5. Extract     →  /alata:evolve extract (package solution)
6. Finish      →  /alata:finish (merge/PR/close)
```

## Hook Events Reference
| Hook | Event | What it does |
|------|-------|-------------|
| session-start | SessionStart | Init, load memories, decay capsules |
| scrubber | UserPromptSubmit | Block accidental API key/password paste |
| progress-save | PostToolUse (Write/Edit/Bash) | Append to progress.md |
| stop-verify | Stop | Remind about Capsule extract |
