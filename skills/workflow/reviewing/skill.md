# Reviewing Skill

## Purpose
Lightweight code review before merging a Task Space. Three checks only (YAGNI principle).

## Command
`/alata:review`

## The Three Checks

### Check 1: Plan Conformance
Did we implement what `task_plan.md` said?
- Read task_plan.md steps, compare against git diff
- Flag any steps marked done but not evidenced in diff
- Flag any changes NOT in the plan (scope creep)
- Output: PASS / FAIL with specific line references

### Check 2: Code Quality
Obvious bugs and missing error handling at system boundaries only.
- System boundaries: stdin parsing, file I/O, JSON.parse, external command output
- NOT: internal helper function style, naming preferences, micro-optimizations
- Output: list of specific issues with file:line references, or PASS

### Check 3: Risk Assessment
What could break? Any backwards-incompatible changes?
- Check: does this change the interface of any existing runtime module?
- Check: does this modify shared state files (.alataflow/, .plans/)?
- Check: does this affect hooks that run on every user interaction (scrubber, progress-save)?
- Output: risk level (LOW/MEDIUM/HIGH) with rationale

## Output Format
Append to `.plans/<slug>/findings.md`:
```
[ISO timestamp] [REVIEW] Plan conformance: PASS
[ISO timestamp] [REVIEW] Code quality: 1 issue — hooks/progress-save.js:45 missing try/catch around JSON.parse
[ISO timestamp] [REVIEW] Risk: LOW — no interface changes, no shared state modifications
[ISO timestamp] [REVIEW] SIGN-OFF: proceed to /alata:finish
```

## Pass Criteria
- No blocking issues (Check 1: PASS, Check 2: no critical bugs, Check 3: not HIGH risk)
- If any check fails: fix and re-run review

## Anti-patterns (forbidden)
- Reviewing style/formatting (not our job here)
- Blocking on subjective preferences
- Skipping risk check because "it's a small change"
