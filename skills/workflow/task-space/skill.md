# Task Space Skill

## Purpose
Git worktree abstraction for AlataFlow. Users never need to touch `git worktree` commands directly.
Each Task Space = one isolated git worktree = one focused development context.

## Commands
- `/alata:space create <description>` — create a new Task Space
- `/alata:space status` — list all spaces with status table
- `/alata:space switch <slug>` — switch active space
- `/alata:space clean` — remove completed or stale spaces

## Create Flow
1. Generate slug from description (max 30 chars, kebab-case) via `generateSpaceMeta()`
2. Create git worktree: `git worktree add .worktrees/<slug> -b alataflow/<type>/<slug>`
3. Initialize 3-File Pattern in `.plans/<slug>/`: task_plan.md, findings.md, progress.md
4. Append space to `.alataflow/spaces.json`
5. Write slug to `.alataflow/current_space`
6. Output: "[AlataFlow] Space [<slug>] created on branch alataflow/<type>/<slug>"

## Status Flow
Read `.alataflow/spaces.json` and display as table:
| Slug | Type | Status | Last Active | Branch |
Each row color-coded: active=normal, stale(>24h)=⚠️, completed=✓

## Switch Flow
1. Write new slug to `.alataflow/current_space`
2. Optionally `cd` into `.worktrees/<slug>`

## Clean Flow
1. List spaces where status=completed OR last_active >24h
2. Confirm with user before deleting
3. `git worktree remove .worktrees/<slug>`
4. Remove from `.alataflow/spaces.json`
5. If deleted space was current_space, clear `.alataflow/current_space`

## Git Decisions
- `.plans/<slug>/` lives on the **main branch** (not the worktree branch)
- Worktree branch only carries code changes
- On merge: plans stay behind, not included in the merge commit
- Add `.plans/` to `.gitignore` on worktree branches if needed

## Failure Safety
- Before creating worktree: stash uncommitted changes in current branch (`git stash`)
- If worktree creation fails: clean up partial state, report error to user
- Never leave orphaned worktree directories

## Integration
- Automatically invoked after brainstorming approves a design
- Stop Hook checks `.alataflow/current_space` to decide whether to prompt Capsule extract
