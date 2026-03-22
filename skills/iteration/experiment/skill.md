# Experiment Skill

## Purpose
RL-inspired iteration loop: modify → evaluate → keep/discard → repeat.
For optimization tasks (performance tuning, refactoring, iterative bug fixing).

## Command
```
/alata:experiment --rounds N [--metric "command" --metric-direction higher|lower] [--timeout 300]
```

## Process

### Setup
1. Read `.plans/<slug>/task_plan.md` — extract Verification Commands (fixed evaluation, immutable)
2. Resolve `state_root_path` via `resolveStateRoot(cwd)`
3. Write experiment flag: `state_root_path/.alataflow/experiment_active.<slug>`
4. In Task Space worktree, create temporary branch: `git checkout -b experiment/<slug>-<timestamp>`

### Baseline (Round 0)
5. Run all Verification Commands → record `pass_rate` (passed/total)
6. If `--metric` provided: run metric command → parse last stdout line as float
7. Record baseline row to `state_root_path/.plans/<slug>/experiments.tsv`
8. Detect mode: if pass_rate < 1.0 → `repair` mode, else `normal` mode

### Iteration (Rounds 1..N)
9. For each round (timeout per round: `--timeout` seconds, default 300):
   a. Agent reads experiment history (experiments.tsv) and proposes a modification
   b. Execute the modification (delegate or direct edit)
   c. `git commit -m "experiment-{round}: {description}"`
   d. Run Verification Commands → `new_pass_rate`
   e. If pass_rate unchanged and `--metric` provided → run metric command
   f. Apply Score Contract (§3.5):
      - **Layer 1 (Correctness Gate)**:
        - pass_rate < baseline → DISCARD
        - pass_rate > baseline → KEEP (correctness wins, even if metric drops)
        - pass_rate == baseline → Layer 2
      - **Layer 2 (Optimization Objective)**:
        - With metric: improved → KEEP; <5% change + >30% loc increase → MARGINAL
        - Without metric: loc decrease → KEEP; else → DISCARD
   g. On KEEP: update baseline reference, record to TSV, continue
   h. On DISCARD: `git reset --hard HEAD~1 && git clean -fd`, record to TSV, continue
   i. On MARGINAL: pause, show diff + metrics + loc_delta to user, wait for decision
   j. Update heartbeat in experiment flag
   k. Display round result

### Cleanup
10. Switch back to work branch: `git checkout <work-branch>`
11. Cherry-pick all KEEP commits back to work branch
12. Run Verification Commands one final time on work branch (net-change verification)
13. Delete temporary experiment branch
14. Remove experiment flag file
15. Write experiment summary to `memory.jsonl` via `buildExperimentMemoryEntry()`
16. If net improvement exists → prompt `/alata:evolve extract`
17. Output experiment report

## Score Contract Reference
```
Layer 1: Correctness Gate (binary)
  pass_rate < baseline → DISCARD
  pass_rate > baseline → KEEP
  pass_rate == baseline → Layer 2

Layer 2: Optimization Objective
  With --metric:
    metric improved → KEEP (unless MARGINAL: <5% change + >30% loc)
    metric unchanged + loc decrease → KEEP
    metric unchanged + loc same/increase → DISCARD
    metric worsened → DISCARD
  Without --metric:
    loc decrease → KEEP
    loc same/increase → DISCARD
```

## TSV Schema
```
round  commit  description  pass_rate  metric_value  metric_direction  loc_delta  status  mode  timestamp
```
Status values: `baseline` | `keep` | `discard` | `marginal` | `timeout` | `error`

## Git Isolation
- Experiments run in `experiment/<slug>-<ts>` branch within the Task Space worktree
- Controlled extension of Task Space invariant: HEAD changes, worktree directory stays same
- Keep → cherry-pick back to work branch
- Discard → `git reset --hard HEAD~1 && git clean -fd`
- Guaranteed restoration: experiment branch deleted, work branch HEAD restored

## Hook Behavior During Experiment
- `progress-save`: partial silence (no progress.md write, water-level detection still active)
- `stop-verify`: fully silent (experiment manages its own lifecycle)
- `scrubber`: normal (security scans always active)

## Integration
- Requires: task_plan.md with Verification Commands
- Typically follows: `/alata:execute` (optimize after initial implementation)
- Followed by: `/alata:verify` (final validation on work branch)
- Connects to: `/alata:evolve extract` (on net improvement)

## Anti-patterns
- Modifying Verification Commands during experiment (Goodhart's Law — forbidden)
- Running without Verification Commands defined
- Skipping the final verify on the work branch after cherry-pick
- Running experiments that don't have a measurable objective
