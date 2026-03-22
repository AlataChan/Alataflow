# Capsule Promote Skill

## Purpose
Promote high-confidence Capsules to Skill drafts when they've proven their value through repeated successful use.

## Command
`/alata:evolve promote`

## Promotion Criteria
- Confidence ≥ 0.9 (ceiling is 0.95)
- Use count ≥ 10
- Kind must be `capsule` in memory.jsonl

## Process
1. Scan `memory.jsonl` for capsules meeting promotion criteria via `findPromotionCandidates()`
2. For each candidate:
   a. Check if a skill with the same name already exists — skip if so
   b. Generate skill draft via `generateSkillDraft()`:
      - Derives name from capsule summary (kebab-case, max 30 chars)
      - Category from `tags.area` (default: `general`)
      - Content: markdown skill template with origin metadata
   c. Write to `skills/<category>/<name>/skill.md` via `writeSkillDraft()`
   d. Display: "Promoted capsule [{id}] → skills/{category}/{name}/skill.md"
3. After all candidates processed:
   - Show summary table of promoted capsules
   - Remind: "Review and refine drafted skills before activating"

## Generated Skill Template
```markdown
# <Capsule Summary>

## Purpose
Auto-promoted from Capsule (confidence: X, uses: N, streak: M).
Review and refine before activating.

## Command
`/alata:<name>`

## Process
1. Apply the pattern described below
2. Run verification commands from task_plan.md
3. Confirm results

## Pattern
<capsule content or patch reference>

## Origin
- Capsule ID: <id>
- Confidence: <score>
- Use count: <N>
- Success streak: <M>
- Promoted at: <timestamp>
```

## Integration
- Fed by: Capsule evolution system (`capsule-decay.js`, `evolution-manager.js`)
- Confidence grows: +0.05 per successful use, -0.10 per failure
- Monthly decay: ×0.95 if unused for 30+ days
- Drafted skills require human review before becoming active

## Anti-patterns
- Promoting capsules that have low diversity of use cases (10 uses in same project ≠ generalized)
- Activating promoted skills without human review
- Bypassing the confidence threshold (let capsules earn promotion naturally)
