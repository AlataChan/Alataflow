# Verification Loop Skill

## Purpose
Verify implementation before claiming completion. Evidence-first workflow.
Hard rule: **never say "done" without running verification commands and showing output.**

## Command
`/alata:verify`

## Process
1. Read `.plans/<slug>/task_plan.md` — collect all "Verification Commands" listed
2. Run each command, capture full output
3. Evaluate:
   - All pass → proceed to `/alata:finish` or `/alata:evolve extract`
   - Any fail → fix the issue, re-run failed command, repeat until green
4. Append verification summary to `.plans/<slug>/findings.md`:
   ```
   [ISO timestamp] [VERIFY] All 3 commands passed — ready for finishing
   ```
   Or on failure:
   ```
   [ISO timestamp] [VERIFY_FAIL] node --test runtime/init.test.js: 1 failed — TypeError at line 12
   ```

## Verification Command Examples
```bash
node --test runtime/*.test.js          # run all tests
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('valid')"
echo '{"prompt":"hello","cwd":"/tmp"}' | node hooks/scrubber.js && echo 'OK'
```

## Integration
- Stop Hook prompts Capsule extract after this passes
- finishing skill requires verification to have passed first

## Anti-patterns (forbidden)
- Saying "tests should pass" without running them
- Marking tasks complete based on code review alone
- Skipping verification because "it looks right"
