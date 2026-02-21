# Capsule Extract Skill

## Purpose
Package a verified solution into a reusable Capsule for future recall and application.
A Capsule = git patch diff + metadata + validation evidence.

## Command
`/alata:evolve extract`

## When to Invoke
- After verification-loop passes (all tests green)
- Stop Hook prompts automatically when write_count > 0 in active Task Space

## Process
1. Run `git diff HEAD` in the current Task Space worktree to get the patch
2. Ask user:
   - Summary: one-line description of what this pattern solves (e.g. "FastAPI OAuth2 password flow setup")
   - Validation notes: what tests/commands passed (evidence)
   - Optional: Gene ID to link to a broader pattern template
3. Call `extractCapsule(projectRoot, { summary, patch_diff, validation_notes, tags })`
4. Write capsule ID to `.plans/<slug>/findings.md`: `[ISO] [CAPSULE] <id> — <summary>`
5. Confirm: "[AlataFlow] Capsule <id> created in .alataflow/evolution/capsules/<id>/"

## Output Structure
```
.alataflow/evolution/capsules/<capsule-id>/
├── capsule.json       # metadata, confidence, tags
├── patch.diff         # git diff output
└── validation.md      # test results, evidence
```

## capsule.json Schema
```json
{
  "capsule_id": "cap-abc123",
  "gene_id": null,
  "summary": "FastAPI OAuth2 setup pattern",
  "tags": { "project": "/path", "type": "pattern", "area": "auth" },
  "confidence": 0.5,
  "success_streak": 0,
  "use_count": 0,
  "validation": "verified",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "last_used_at": "ISO timestamp"
}
```

## Notes
- Confidence starts at 0.5 (unproven)
- Confidence grows with each successful `/alata:evolve apply`
- Monthly decay: confidence × 0.95 for capsules unused >30 days (run at SessionStart)
