# Checkpoint Skill

## Purpose
Save and restore progress snapshots for long-running tasks.
Prevents context loss across sessions or during compression.

## Commands
- `/alata:checkpoint` — save current progress snapshot
- `/alata:checkpoint resume` — restore from saved snapshot
- `/alata:checkpoint clear` — remove checkpoint file

## Save Process
1. Read current space slug from `.alataflow/current_space`
2. Read `.plans/<slug>/task_plan.md` — determine current step index
3. Collect context:
   - `step_index`: which step we're on
   - `total_steps`: total steps in plan
   - `pending_items`: remaining work items
   - `context_summary`: key decisions and state (user provides or auto-extract)
4. Write to `.plans/<slug>/checkpoint.json` via `saveCheckpoint()`
5. Output: "Checkpoint saved at step {N}/{total}"

## Resume Process
1. Read `.plans/<slug>/checkpoint.json` via `detectCheckpoint()`
2. Display saved context to user:
   - Step position
   - Pending items
   - Context summary
3. Ask user: "Resume from step {N}?" — proceed on confirmation
4. Continue with `/alata:execute` from the saved step

## Clear Process
1. Delete `.plans/<slug>/checkpoint.json` via `clearCheckpoint()`
2. Output: "Checkpoint cleared"

## Auto-Detection
- `session-start.js` checks for checkpoint on every session start
- If found and < 7 days old: shows recovery prompt
- If > 7 days old: silently ignored (stale)

## Checkpoint Schema
```json
{
  "slug": "task-slug",
  "step_index": 3,
  "total_steps": 8,
  "pending_items": ["implement API", "write tests"],
  "context_summary": "Working on auth feature, JWT chosen over sessions",
  "saved_at": "2026-03-22T10:30:00Z"
}
```

## Priority Order (session recovery)
1. `checkpoint.json` (explicit save)
2. `session_state.json` (ephemeral session data)
3. `progress.md` (tool call log, last resort)

## Integration
- `/alata:execute` auto-saves checkpoint every 3 steps
- `pre-compact.js` hook saves context summary before compression
- `session-start.js` detects and prompts for checkpoint recovery

## Anti-patterns
- Relying on checkpoint for version control (use git)
- Saving checkpoints for trivial tasks
- Ignoring checkpoint prompts repeatedly (either resume or clear)
