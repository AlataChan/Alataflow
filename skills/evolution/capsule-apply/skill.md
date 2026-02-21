# Capsule Apply Skill

## Purpose
Recall and apply a past Capsule in a new Task Space context, with confidence tracking.

## Command
`/alata:evolve apply <capsule-id>`

## When to Invoke
- During `/alata:plan` — search for matching Capsules before generating a new plan
- User recognizes a pattern that was solved before

## Process
1. **Search**: If no capsule-id given, search `.alataflow/evolution/capsules/` by keyword or tag
   - Display matches: capsule_id, summary, confidence, last_used_at
2. **User selects** a capsule to apply
3. **Apply**: run `git apply <patch.diff>` in the current Task Space worktree
   - If conflicts: show conflict details, let user resolve manually
4. **Validate**: run commands from `validation.md` automatically
5. **Track result**:
   - Pass → `updateCapsuleStats(stats, true)` → confidence += 0.05, streak++
   - Fail → `updateCapsuleStats(stats, false)` → confidence -= 0.10, streak = 0
6. Write result to findings.md: `[ISO] [CAPSULE_APPLY] <id> success=true confidence=0.55`

## Search Output Example
```
[AlataFlow] Found 2 capsules matching "auth":

1. cap-abc123 — FastAPI OAuth2 setup pattern
   confidence: 0.75 | used: 3x | last: 2026-02-10 | area: auth
   
2. cap-def456 — JWT token refresh middleware
   confidence: 0.60 | used: 1x | last: 2026-01-28 | area: auth

Apply which capsule? (1/2/skip):
```

## Failure Recovery
If `git apply` fails:
1. Report: "Patch did not apply cleanly — conflicts in: <files>"
2. Do NOT auto-resolve
3. User decides: resolve manually or skip this capsule
