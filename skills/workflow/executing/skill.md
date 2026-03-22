# Execute Skill

## Purpose
Read task_plan.md and execute steps in batches. Bridges planning and verification — the "do the work" phase.

## Command
`/alata:execute`

## Process
1. Read `.plans/<slug>/task_plan.md` — parse numbered steps
2. Check for checkpoint: if `.plans/<slug>/checkpoint.json` exists, resume from saved step_index
3. For each step (or batch of related steps):
   a. Display the step to the user
   b. Delegate execution:
      - v1.0: Execute in main context (serial)
      - v1.1+: Use Agent tool with subagent for fresh context (Phase C1)
   c. After each step completes, update progress (auto-tracked by hook)
   d. If a step fails: pause, show error, ask user how to proceed
4. After all steps complete:
   - Display summary of completed steps
   - Prompt: "All steps executed. Run `/alata:verify` to validate."

## Delegation Template
When delegating to Codex/Gemini:
```
/ask codex "[TASK] <step description>
[FILES] <files from task_plan.md>
[CONTEXT] <relevant code snippets or constraints>
[CRITERIA] <what 'done' means for this step>"
```

## Checkpoint Integration
- Before starting: check `detectCheckpoint()` — resume if found
- Every 3 steps: auto-save checkpoint via `saveCheckpoint()`
- On user interrupt: save checkpoint immediately

## Integration
- Requires: task_plan.md from `/alata:plan`
- Followed by: `/alata:verify` or `/alata:experiment`
- Progress tracked by: progress-save hook

## Anti-patterns
- Executing without reading the plan first
- Skipping steps or reordering without user approval
- Continuing after a critical failure without user input
- Delegating all steps at once (batch responsibly)
