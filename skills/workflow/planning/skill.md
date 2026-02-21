# Planning Skill

## Purpose
Create the 3-File Pattern for a Task Space: task_plan.md (implementation steps), findings.md (discoveries), progress.md (auto-managed by PostToolUse hook).

## Commands
- `/alata:plan <description>` — full flow: brainstorming → task-space → planning
- `/alata:plan --mode repair` — fix broken functionality
- `/alata:plan --mode optimize` — improve performance or quality
- `/alata:plan --mode innovate` — add new capability

## Planning Modes

### Repair Mode
Focus: identify root cause, minimal fix, regression tests.
Output: task_plan.md with diagnosis section + targeted fix steps.

### Optimize Mode
Focus: measure first (benchmarks/profiling), then change.
Output: task_plan.md with baseline metrics + optimization steps.

### Innovate Mode
Focus: design first (brainstorming skill), then implement.
Output: task_plan.md with design decisions + implementation steps.

## 3-File Pattern

### task_plan.md
```markdown
# Task: <description>
Mode: <repair|optimize|innovate>
Space: <slug>
Created: <ISO timestamp>

## Steps
- [ ] Step 1: description (verification: command to run)
- [ ] Step 2: description (verification: command to run)
...

## Verification Commands
```bash
# Run these to confirm completion
<commands>
```

## Acceptance Criteria
- Criterion 1
- Criterion 2
```

### findings.md
Append-only log of discoveries. Format:
```
[ISO timestamp] [FINDING] description
[ISO timestamp] [DECISION] decision made and rationale
[ISO timestamp] [REVIEW] review note
```

### progress.md
Auto-managed by PostToolUse hook. Do not edit manually.
Format: `[ISO timestamp] [ToolName] file_path_or_command`

## Integration
- Runs after task-space creates the space
- Writes all files to `.plans/<slug>/`
- Hard gate: no implementation until task_plan.md is written and user confirms
