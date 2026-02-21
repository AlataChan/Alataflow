# Finishing Skill

## Purpose
Cleanly merge or close a Task Space after verification passes.

## Command
`/alata:finish`

## Prerequisites
- Verification loop must have passed (check findings.md for [VERIFY] entry)
- No uncommitted changes in the Task Space worktree

## Options (present to user)
1. **Merge to main** — merge worktree branch, clean up Space
2. **Create PR** — push branch and open GitHub PR
3. **Keep open** — defer decision, leave Space active
4. **Discard** — delete worktree without merging (safe — zero blast radius on main)

## Merge Flow (Option 1)
1. In main branch: `git merge alataflow/<type>/<slug> --no-ff -m "feat：merge <slug> — <summary>"`
2. Delete worktree: `git worktree remove .worktrees/<slug>`
3. Update `.alataflow/spaces.json`: set status=completed for this space
4. Clear `.alataflow/current_space` (write empty string)
5. Prompt: `/alata:evolve extract` if not already done this session
6. Confirm: "[AlataFlow] Space [<slug>] merged and closed."

## PR Flow (Option 2)
1. Push branch: `git push -u origin alataflow/<type>/<slug>`
2. Create PR: `gh pr create --title "<summary>" --body "<task_plan.md summary>"`
3. Keep Space open (status=review_pending) until PR merged
4. After merge: run Option 1 cleanup steps

## Discard Flow (Option 4)
1. Confirm with user: "This will delete all changes in [<slug>]. Confirm? (yes/no)"
2. `git worktree remove .worktrees/<slug> --force`
3. Remove from `.alataflow/spaces.json`
4. Clear `.alataflow/current_space`
5. Confirm: "[AlataFlow] Space [<slug>] discarded."

## Post-merge Prompt
Always prompt after successful merge:
"Did you want to extract a Capsule from this session? Run `/alata:evolve extract` to package the solution for future reuse."
